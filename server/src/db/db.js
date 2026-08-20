const path = require("path");
const fs = require("fs");

// In production (Render), DATA_DIR points at a mounted persistent disk, separate from
// this source directory — so the disk (which starts empty) never hides schema.sql or
// seed_data/, which live in the repo alongside this file. Locally, DATA_DIR just
// defaults to this same folder for convenience.
const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "costing.db");
const isNew = !fs.existsSync(DB_PATH);

const { DatabaseSync } = require("node:sqlite");

const rawDb = new DatabaseSync(DB_PATH);
rawDb.exec("PRAGMA journal_mode = WAL");
rawDb.exec("PRAGMA foreign_keys = ON");

// One-off migration guard: test_overhead_master's columns were renamed (per-test rates ->
// annual totals + volume, so overhead computes live instead of being a fixed constant —
// see costEngine.js). CREATE TABLE IF NOT EXISTS won't touch an existing table with the
// old column names, so detect that case here and drop it — it'll be recreated with the
// new schema below, then reseeded (this table only ever held seed-derived data up to this
// point, so this is safe; it does mean any manual edits made to Lab/Radiology overhead
// figures before this deploy will need to be re-entered).
let overheadMigrated = false;
try {
  const cols = rawDb.prepare("PRAGMA table_info(test_overhead_master)").all();
  const hasOldSchema = cols.some((c) => c.name === "manpower_actual");
  if (hasOldSchema) {
    console.log("Migrating test_overhead_master to the new annual-total schema (old per-test-rate data will be reseeded)...");
    rawDb.exec("DROP TABLE test_overhead_master");
    overheadMigrated = true;
  }
} catch (e) {
  // table doesn't exist yet on a fresh database — nothing to migrate
}

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
rawDb.exec(schema);

// Thin wrapper so the rest of the app's db.prepare(...).run/get/all/transaction calls work unchanged
const db = {
  prepare: (sql) => rawDb.prepare(sql),
  exec: (sql) => rawDb.exec(sql),
  transaction: (fn) => (...args) => {
    rawDb.exec("BEGIN");
    try {
      const result = fn(...args);
      rawDb.exec("COMMIT");
      return result;
    } catch (e) {
      rawDb.exec("ROLLBACK");
      throw e;
    }
  },
};

module.exports = { db, isNew };
