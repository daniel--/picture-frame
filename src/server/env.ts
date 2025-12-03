/**
 * Environment configuration with validation
 * This file validates all required environment variables at startup
 */

interface EnvConfig {
  JWT_SECRET: string;
  DB_FILE_NAME: string;
  NODE_ENV: "development" | "production";
  PORT: number;
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

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }

  return {
    JWT_SECRET: jwtSecret!,
    DB_FILE_NAME: dbFileName!,
    NODE_ENV: (nodeEnv as "development" | "production") || "development",
    PORT: port,
  };
}

// Export validated config
export const env = getEnvConfig();

