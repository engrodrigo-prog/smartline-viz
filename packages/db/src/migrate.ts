import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDbPool } from "./index.js";

async function main() {
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const migrationsDir = resolve(__dirname, "../migrations");
  const pool = getDbPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      executed_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const alreadyRan = await pool.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
    if (alreadyRan.rowCount > 0) {
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    if (!sql.trim()) continue;

    console.log(`[migrate] applying ${file}`);
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations(name) VALUES ($1)", [file]);
  }

  await pool.end();
  console.log("[migrate] completed");
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
