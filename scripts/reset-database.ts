import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

// Load environment variables
config();

async function resetDatabase() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment");
    process.exit(1);
  }

  console.log("🗑️  Resetting database...\n");

  try {
    const sql = neon(DATABASE_URL);

    console.log("Dropping all tables...\n");

    // Drop tables in correct order (respecting foreign key constraints)
    await sql`DROP TABLE IF EXISTS "account" CASCADE`;
    console.log("  ✓ Dropped account");

    await sql`DROP TABLE IF EXISTS "session" CASCADE`;
    console.log("  ✓ Dropped session");

    await sql`DROP TABLE IF EXISTS "submetric" CASCADE`;
    console.log("  ✓ Dropped submetric");

    await sql`DROP TABLE IF EXISTS "metric" CASCADE`;
    console.log("  ✓ Dropped metric");

    await sql`DROP TABLE IF EXISTS "slide" CASCADE`;
    console.log("  ✓ Dropped slide");

    await sql`DROP TABLE IF EXISTS "workspace" CASCADE`;
    console.log("  ✓ Dropped workspace");

    await sql`DROP TABLE IF EXISTS "user" CASCADE`;
    console.log("  ✓ Dropped user");

    await sql`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE`;
    console.log("  ✓ Dropped migrations table");

    console.log("\n✅ Database reset complete!");
    console.log("\n📝 Next steps:");
    console.log("   1. Run: npm run db:migrate");
    console.log("   2. Your database is now clean and ready!");
  } catch (error) {
    console.error("\n❌ Failed to reset database:", error);
    process.exit(1);
  }
}

resetDatabase();
