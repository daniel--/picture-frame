import "dotenv/config";
import { createUser } from "../server/users.js";

function printUsage() {
  console.error("Usage: npm run create-user -- <name> <email> <password>");
  console.error("   or: tsx src/scripts/create-user.ts <name> <email> <password>");
  console.error("");
  console.error("Example:");
  console.error('  npm run create-user -- "John Doe" john@example.com mypassword123');
}

async function main() {
  // Skip first two args: node executable and script path
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error("Error: Missing required arguments\n");
    printUsage();
    process.exit(1);
  }

  const [name, email, password] = args;

  if (!name.trim() || !email.trim() || !password.trim()) {
    console.error("Error: Name, email, and password cannot be empty\n");
    printUsage();
    process.exit(1);
  }

  try {
    console.log("Creating user...");

    const user = await createUser({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
    });

    console.log("\n✓ User created successfully!");
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Created at: ${user.createdAt || "N/A"}`);
  } catch (error) {
    console.error("\n✗ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
