const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "costing.db");
const isNew = !fs.existsSync(DB_PATH);

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
