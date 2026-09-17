import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const migrationDirectory = fileURLToPath(
  new URL("../migrations", import.meta.url),
);
const migrationFiles = (await readdir(migrationDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

for (const migrationFile of migrationFiles) {
  const applied = await pool.query(
    "SELECT 1 FROM schema_migrations WHERE version = $1",
    [migrationFile],
  );
  if (applied.rowCount) continue;

  const migration = await readFile(
    `${migrationDirectory}/${migrationFile}`,
    "utf8",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(migration);
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [
      migrationFile,
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

await pool.end();
console.log("Database ready.");
