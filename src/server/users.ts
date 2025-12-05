import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { usersTable, User } from "./db/schema.js";
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

const SALT_ROUNDS = 10;

/**
 * Creates a new user with a hashed password
 * @param input User creation input (name, email, password)
 * @returns Created user (without password)
 * @throws Error if email already exists or validation fails
 */
export async function createUser(input: CreateUserInput): Promise<Omit<User, "password">> {
  const { name, email, password } = input;

  // Validate input
  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", ErrorType.BAD_REQUEST);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters long", ErrorType.BAD_REQUEST);
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

  return newUser;
}

/**
 * Authenticates a user with email and password
 * @param input Login input (email, password)
 * @returns User object if authentication succeeds (without password)
 * @throws Error if credentials are invalid
 */
export async function login(input: LoginInput): Promise<Omit<User, "password">> {
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

  // Return user without password
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
