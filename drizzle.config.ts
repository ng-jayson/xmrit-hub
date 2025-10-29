import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load environment variables from .env file
config();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
