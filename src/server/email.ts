import nodemailer from "nodemailer";
import { env } from "./env.js";

/**
 * Email service for sending transactional emails
 * Supports Gmail SMTP and other SMTP servers
 * Gracefully handles missing email configuration (returns without error)
 */

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize the email service with configuration from env.ts
 * This is called automatically when the module is imported
 */
function initializeEmailService() {
  const emailConfig = env.email;

  if (!emailConfig) {
    console.log(
      "Email service disabled or not configured. Email functionality will be unavailable."
    );
    return;
  }

  // Create transporter
  transporter = nodemailer.createTransport({
    host: emailConfig.smtpHost,
    port: emailConfig.smtpPort,
    secure: emailConfig.smtpSecure,
    auth: {
      user: emailConfig.smtpUser,
      pass: emailConfig.smtpPassword,
    },
  });

  console.log(`Email service initialized (SMTP: ${emailConfig.smtpHost}:${emailConfig.smtpPort})`);
}

// Initialize on module load
initializeEmailService();

/**
 * Check if email service is configured and available
 */
export function isEmailEnabled(): boolean {
  return env.email !== null && transporter !== null;
}

/**
 * Send an email
 * @param to Recipient email address
 * @param subject Email subject
 * @param text Plain text body
 * @param html HTML body (optional)
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  const emailConfig = env.email;
  if (!isEmailEnabled() || !emailConfig || !transporter) {
    console.log("=".repeat(80));
    console.log("EMAIL (Email service not configured - printing to console)");
    console.log("=".repeat(80));
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("-".repeat(80));
    console.log("Text Content:");
    console.log(text);
    if (html) {
      console.log("-".repeat(80));
      console.log("HTML Content:");
      console.log(html);
    }
    console.log("=".repeat(80));
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log(`Email sent successfully to: ${to}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Send a password reset email
 * @param to Recipient email address
 * @param resetToken Password reset token
 * @param resetUrl Base URL for the application (e.g., https://example.com)
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  resetUrl: string
): Promise<void> {
  const resetLink = `${resetUrl}/reset-password?token=${resetToken}`;

  const appName = env.APP_NAME;
  const subject = `Password Reset Request - ${appName}`;
  const text = `You requested a password reset for your ${appName} account.

Click the following link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>You requested a password reset for your ${appName} account.</p>
      <p>
        <a href="${resetLink}" 
           style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetLink}</p>
      <p style="color: #999; font-size: 12px;">
        This link will expire in 1 hour.<br/>
        If you did not request this password reset, please ignore this email.
      </p>
    </div>
  `;

  await sendEmail(to, subject, text, html);
}

/**
 * Send an invite email with a link to create an account
 * @param to Recipient email address
 * @param inviteToken Invite token
 * @param appUrl Base URL for the application (e.g., https://example.com)
 */
export async function sendInviteEmail(
  to: string,
  inviteToken: string,
  appUrl: string
): Promise<void> {
  const inviteLink = `${appUrl}/accept-invite?token=${inviteToken}`;
  const appName = env.APP_NAME;

  const subject = `You've been invited to ${appName}`;
  const text = `You've been invited to create an account for ${appName}.

Click the following link to create your account:
${inviteLink}

This invite will expire in 7 days.

If you did not expect this invite, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">You've been invited to ${appName}</h2>
      <p>You've been invited to create an account for ${appName}.</p>
      <p>
        <a href="${inviteLink}" 
           style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
          Accept Invite & Create Account
        </a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${inviteLink}</p>
      <p style="color: #999; font-size: 12px;">
        This invite will expire in 7 days.<br/>
        If you did not expect this invite, please ignore this email.
      </p>
    </div>
  `;

  await sendEmail(to, subject, text, html);
}

/**
 * Send a welcome email (optional, for new user registration)
 * @param to Recipient email address
 * @param userName User's name
 */
export async function sendWelcomeEmail(to: string, userName: string): Promise<void> {
  const appName = env.APP_NAME;
  const subject = `Welcome to ${appName}`;
  const text = `Welcome to ${appName}, ${userName}!

Your account has been successfully created. You can now log in and start uploading your photos.

Enjoy your digital picture frame!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to ${appName}!</h2>
      <p>Hi ${userName},</p>
      <p>Your account has been successfully created. You can now log in and start uploading your photos.</p>
      <p>Enjoy your digital picture frame! 📸</p>
    </div>
  `;

  await sendEmail(to, subject, text, html);
}
