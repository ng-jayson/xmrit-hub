import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Load environment variables
config();

async function createDefaultWorkspace() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment");
    process.exit(1);
  }

  console.log("🚀 Creating default workspace...\n");

  try {
    const sql = neon(DATABASE_URL);

    // Check if a workspace already exists
    const existingWorkspaces = await sql`
      SELECT id, name FROM "workspace"
      WHERE name = 'Default Workspace'
      LIMIT 1
    `;

    let workspaceId: string;

    if (existingWorkspaces.length > 0) {
      workspaceId = existingWorkspaces[0].id;
      console.log("✓ Default workspace already exists");
      console.log(`  ID: ${workspaceId}`);
      console.log(`  Name: ${existingWorkspaces[0].name}\n`);
    } else {
      // Create a new default workspace
      const newWorkspace = await sql`
        INSERT INTO "workspace" (id, name, description, "isPublic", "isArchived", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          'Default Workspace',
          'Default workspace for metrics and slides',
          true,
          false,
          NOW(),
          NOW()
        )
        RETURNING id, name
      `;

      workspaceId = newWorkspace[0].id;
      console.log("✅ Created new default workspace");
      console.log(`  ID: ${workspaceId}`);
      console.log(`  Name: ${newWorkspace[0].name}\n`);
    }

    // Update n8n.json with the workspace ID
    const n8nJsonPath = join(process.cwd(), "n8n.json");

    try {
      const n8nConfig = JSON.parse(readFileSync(n8nJsonPath, "utf-8"));

      // Find the HTTP Request node and update the workspace_id
      let updated = false;
      for (const node of n8nConfig.nodes) {
        if (
          node.name === "HTTP Request" &&
          node.type === "n8n-nodes-base.httpRequest"
        ) {
          // Update the body parameter that contains workspace_id
          const bodyParam = node.parameters.body;
          if (bodyParam && bodyParam.includes("workspace_id")) {
            // Replace the workspace_id value in the stringified JSON within the body
            node.parameters.body = bodyParam.replace(
              /workspace_id:\s*"[^"]*"/,
              `workspace_id: "${workspaceId}"`
            );
            updated = true;
            console.log("✅ Updated n8n.json with new workspace ID");
          }
        }
      }

      if (updated) {
        writeFileSync(n8nJsonPath, JSON.stringify(n8nConfig, null, 2));
        console.log(`  File: ${n8nJsonPath}\n`);
      } else {
        console.log("⚠️  Could not find workspace_id in n8n.json to update");
        console.log(
          "  Please manually update the workspace_id in your n8n workflow\n"
        );
      }
    } catch (fileError) {
      console.log("⚠️  Could not update n8n.json file");
      console.log(
        "  Please manually update the workspace_id in your n8n workflow\n"
      );
    }

    console.log("📝 Next steps:");
    console.log("   1. Use this workspace ID in your n8n workflow");
    console.log("   2. Import n8n.json to your n8n instance");
    console.log("   3. Configure Metabase credentials and collection ID");
    console.log("   4. Start ingesting data!\n");
    console.log(`💡 Workspace ID: ${workspaceId}`);
  } catch (error) {
    console.error("\n❌ Failed to create workspace:", error);
    process.exit(1);
  }
}

createDefaultWorkspace();
