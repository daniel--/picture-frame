/**
 * Environment configuration with validation
 * This file validates all required environment variables at startup
 */

interface EmailConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

interface EnvConfig {
  JWT_SECRET: string;
  DB_FILE_NAME: string;
  NODE_ENV: "development" | "production";
  PORT: number;
  email: EmailConfig | null;
  APP_URL: string | null;
}

/**
 * Validates and returns the environment configuration
 * @throws {Error} If any required environment variable is missing or invalid
 */
export function getEnvConfig(): EnvConfig {
  const errors: string[] = [];

  // Validate JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push("JWT_SECRET is required");
  }

  // Validate DB_FILE_NAME
  const dbFileName = process.env.DB_FILE_NAME;
  if (!dbFileName) {
    errors.push("DB_FILE_NAME is required");
  }

  // Validate NODE_ENV (optional, defaults to development)
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv && nodeEnv !== "development" && nodeEnv !== "production") {
    errors.push("NODE_ENV must be either 'development' or 'production'");
  }

  // Validate PORT (optional, defaults to 3000)
  const portStr = process.env.PORT;
  let port = 3000;
  if (portStr) {
    port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push("PORT must be a valid port number (1-65535)");
    }
  }

  // Email configuration (optional)
  let email: EmailConfig | null = null;
  const emailEnabled = process.env.EMAIL_ENABLED === "true";
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.EMAIL_FROM;

  if (emailEnabled) {
    if (!smtpHost || !smtpUser || !smtpPassword || !fromEmail) {
      console.warn(
        "EMAIL_ENABLED is true but SMTP configuration is incomplete. Email functionality will be unavailable."
      );
    } else {
      const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
      const smtpSecure = process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465";

      email = {
        enabled: true,
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpPassword,
        fromEmail,
        fromName: process.env.EMAIL_FROM_NAME || "Picture Frame",
      };
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  // APP_URL (optional, for password reset links)
  const appUrl = process.env.APP_URL || null;

  return {
    JWT_SECRET: jwtSecret!,
    DB_FILE_NAME: dbFileName!,
    NODE_ENV: (nodeEnv as "development" | "production") || "development",
    PORT: port,
    email,
    APP_URL: appUrl,
  };
}

// Export validated config
export const env = getEnvConfig();
