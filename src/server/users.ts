import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { usersTable, User, invitesTable, Invite } from "./db/schema.js";
import { AppError, ErrorType } from "./errors.js";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RequestPasswordResetInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface CreateInviteInput {
  email: string;
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1;
const INVITE_EXPIRY_DAYS = 7;

// Public user type (without sensitive fields)
export type PublicUser = Omit<User, "password" | "resetToken" | "resetTokenExpiry">;

/**
 * Creates a new user with a hashed password
 * @param input User creation input (name, email, password)
 * @returns Created user (without password and reset token fields)
 * @throws Error if email already exists or validation fails
 */
export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const { name, email, password } = input;

  // Validate input
  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", ErrorType.BAD_REQUEST);
  }

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new AppError("User with this email already exists", ErrorType.CONFLICT);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const [newUser] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      password: hashedPassword,
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    });

  // Return user without password, resetToken, and resetTokenExpiry
  const publicUser: PublicUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  };
  return publicUser;
}

/**
 * Authenticates a user with email and password
 * @param input Login input (email, password)
 * @returns User object if authentication succeeds (without password and reset token fields)
 * @throws Error if credentials are invalid
 */
export async function login(input: LoginInput): Promise<PublicUser> {
  const { email, password } = input;

  // Validate input
  if (!email || !password) {
    throw new AppError("Email and password are required", ErrorType.BAD_REQUEST);
  }

  // Find user by email
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user) {
    throw new AppError("Invalid email or password", ErrorType.UNAUTHORIZED);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", ErrorType.UNAUTHORIZED);
  }

  // Return user without password, resetToken, and resetTokenExpiry
  const publicUser: PublicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  return publicUser;
}

/**
 * Generates a password reset token for a user
 * @param input Request password reset input (email)
 * @returns Reset token if user exists
 * @throws Error if user not found
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput
): Promise<{ token: string }> {
  const { email } = input;

  // Validate input
  if (!email) {
    throw new AppError("Email is required", ErrorType.BAD_REQUEST);
  }

  // Find user by email
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  // For security, don't reveal if user exists or not
  // Always return success, but only generate token if user exists
  if (!user) {
    // Still return a fake token to prevent email enumeration
    return { token: "" };
  }

  // Generate secure random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Calculate expiry time (1 hour from now)
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + RESET_TOKEN_EXPIRY_HOURS);
  const expiryTimestamp = expiryDate.toISOString();

  // Save token to database
  await db
    .update(usersTable)
    .set({
      resetToken,
      resetTokenExpiry: expiryTimestamp,
    })
    .where(eq(usersTable.email, email));

  return { token: resetToken };
}

/**
 * Resets a user's password using a reset token
 * @param input Reset password input (token, newPassword)
 * @throws Error if token is invalid, expired, or password validation fails
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const { token, newPassword } = input;

  // Validate input
  if (!token || !newPassword) {
    throw new AppError("Token and new password are required", ErrorType.BAD_REQUEST);
  }

  // Find user by reset token
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.resetToken, token))
    .limit(1);

  if (!user) {
    throw new AppError("Invalid or expired reset token", ErrorType.UNAUTHORIZED);
  }

  // Check if token is expired
  if (!user.resetTokenExpiry) {
    throw new AppError("Invalid or expired reset token", ErrorType.UNAUTHORIZED);
  }

  const expiryDate = new Date(user.resetTokenExpiry);
  const now = new Date();

  if (expiryDate < now) {
    throw new AppError(
      "Reset token has expired. Please request a new one.",
      ErrorType.UNAUTHORIZED
    );
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password and clear reset token
  await db
    .update(usersTable)
    .set({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(usersTable.id, user.id));
}

/**
 * Creates an invite for a new user
 * @param input Create invite input (email)
 * @returns Invite token
 * @throws Error if email already exists as user or invite is already pending
 */
export async function createInvite(input: CreateInviteInput): Promise<{ token: string }> {
  const { email } = input;

  // Validate input
  if (!email) {
    throw new AppError("Email is required", ErrorType.BAD_REQUEST);
  }

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new AppError("User with this email already exists", ErrorType.CONFLICT);
  }

  // Check if there's already a pending invite for this email
  const existingInvites = await db
    .select()
    .from(invitesTable)
    .where(eq(invitesTable.email, email))
    .limit(1);

  // If there's an existing invite, check if it's still valid (not used and not expired)
  for (const invite of existingInvites) {
    if (invite.used === 0) {
      const expiryDate = new Date(invite.expiresAt);
      const now = new Date();
      if (expiryDate > now) {
        throw new AppError("An active invite already exists for this email", ErrorType.CONFLICT);
      }
    }
  }

  // Generate secure random token
  const inviteToken = crypto.randomBytes(32).toString("hex");

  // Calculate expiry time (7 days from now)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + INVITE_EXPIRY_DAYS);
  const expiryTimestamp = expiryDate.toISOString();

  // Create invite
  await db.insert(invitesTable).values({
    email,
    token: inviteToken,
    expiresAt: expiryTimestamp,
    used: 0,
  });

  return { token: inviteToken };
}

/**
 * Validates an invite token and returns invite information
 * @param token Invite token
 * @returns Invite information if valid
 * @throws Error if token is invalid, expired, or already used
 */
export async function validateInvite(token: string): Promise<{ email: string }> {
  if (!token) {
    throw new AppError("Invite token is required", ErrorType.BAD_REQUEST);
  }

  // Find invite by token
  const [invite] = await db
    .select()
    .from(invitesTable)
    .where(eq(invitesTable.token, token))
    .limit(1);

  if (!invite) {
    throw new AppError("Invalid invite token", ErrorType.UNAUTHORIZED);
  }

  // Check if invite has been used
  if (invite.used === 1) {
    throw new AppError("This invite has already been used", ErrorType.UNAUTHORIZED);
  }

  // Check if invite is expired
  const expiryDate = new Date(invite.expiresAt);
  const now = new Date();

  if (expiryDate < now) {
    throw new AppError(
      "This invite has expired. Please request a new invite.",
      ErrorType.UNAUTHORIZED
    );
  }

  // Check if user already exists (in case invite was created but user registered another way)
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, invite.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new AppError("A user with this email already exists", ErrorType.CONFLICT);
  }

  return { email: invite.email };
}

/**
 * Accepts an invite and creates a user account
 * @param input Accept invite input (token, name, password)
 * @returns Created user (without password and reset token fields)
 * @throws Error if token is invalid, expired, or password validation fails
 */
export async function acceptInvite(input: AcceptInviteInput): Promise<PublicUser> {
  const { token, name, password } = input;

  // Validate input
  if (!token || !name || !password) {
    throw new AppError("Token, name, and password are required", ErrorType.BAD_REQUEST);
  }

  // Validate invite token and get email
  const { email } = await validateInvite(token);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const [newUser] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      password: hashedPassword,
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    });

  // Mark invite as used
  await db.update(invitesTable).set({ used: 1 }).where(eq(invitesTable.token, token));

  // Return user without password, resetToken, and resetTokenExpiry
  const publicUser: PublicUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  };
  return publicUser;
}

/**
 * Gets all users (public information only)
 * @returns Array of all users (without passwords and reset tokens)
 */
export async function getAllUsers(): Promise<PublicUser[]> {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    })
    .from(usersTable);

  return users;
}

/**
 * Public invite type (for admin display)
 */
export type PublicInvite = {
  id: number;
  email: string;
  token: string;
  expiresAt: string;
  used: number;
  createdAt: string | null;
  updatedAt: string | null;
  isExpired: boolean;
  isPending: boolean;
};

/**
 * Gets all invites with their status (pending, expired, used)
 * @returns Array of all invites with computed status
 */
export async function getAllInvites(): Promise<PublicInvite[]> {
  const invites = await db.select().from(invitesTable);

  const now = new Date();

  return invites.map((invite) => {
    const expiryDate = new Date(invite.expiresAt);
    const isExpired = expiryDate < now;
    const isPending = invite.used === 0 && !isExpired;

    return {
      id: invite.id,
      email: invite.email,
      token: invite.token,
      expiresAt: invite.expiresAt,
      used: invite.used,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
      isExpired,
      isPending,
    };
  });
}

/**
 * Resends an invite by updating the token and expiry, then sending email
 * @param inviteId The ID of the invite to resend
 * @returns New invite token
 * @throws Error if invite not found or email service unavailable
 */
export async function resendInvite(inviteId: number): Promise<{ token: string }> {
  // Find the invite
  const [invite] = await db
    .select()
    .from(invitesTable)
    .where(eq(invitesTable.id, inviteId))
    .limit(1);

  if (!invite) {
    throw new AppError("Invite not found", ErrorType.NOT_FOUND);
  }

  // Check if user already exists (in case they registered another way)
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, invite.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new AppError("User with this email already exists", ErrorType.CONFLICT);
  }

  // Generate new secure random token
  const newToken = crypto.randomBytes(32).toString("hex");

  // Calculate new expiry time (7 days from now)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + INVITE_EXPIRY_DAYS);
  const expiryTimestamp = expiryDate.toISOString();

  // Update invite with new token and expiry
  await db
    .update(invitesTable)
    .set({
      token: newToken,
      expiresAt: expiryTimestamp,
      used: 0, // Reset used status if it was set
    })
    .where(eq(invitesTable.id, inviteId));

  return { token: newToken };
}

/**
 * Cancels/deletes an invite
 * @param inviteId The ID of the invite to cancel
 * @throws Error if invite not found
 */
export async function cancelInvite(inviteId: number): Promise<void> {
  // Find the invite
  const [invite] = await db
    .select()
    .from(invitesTable)
    .where(eq(invitesTable.id, inviteId))
    .limit(1);

  if (!invite) {
    throw new AppError("Invite not found", ErrorType.NOT_FOUND);
  }

  // Delete the invite
  await db.delete(invitesTable).where(eq(invitesTable.id, inviteId));
}
