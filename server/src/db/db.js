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
