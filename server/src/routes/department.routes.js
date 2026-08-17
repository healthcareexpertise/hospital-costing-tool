const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireModule } = require("../middleware/rbac");

const router = express.Router();
router.use(requireAuth);

router.get("/", requireModule("SYS_DEPARTMENT_MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM departments ORDER BY display_order").all());
});

router.put("/:id", requireModule("SYS_DEPARTMENT_MASTER", "edit"), (req, res) => {
  const { name, classification, engine_type, driver_type, display_order } = req.body;
  db.prepare(
    `UPDATE departments SET name=?, classification=?, engine_type=?, driver_type=?, display_order=? WHERE id=?`
  ).run(name, classification, engine_type, driver_type, display_order, req.params.id);
  res.json({ ok: true });
});

// ---- User Master (nested here for simplicity) ----
const userRouter = express.Router();
userRouter.use(requireAuth);

userRouter.get("/", requireModule("SYS_USER_MASTER", "view"), (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT u.id, u.username, u.full_name, u.active, p.name as profile_name, p.id as profile_id, d.name as department_name
         FROM users u JOIN profiles p ON p.id=u.profile_id LEFT JOIN departments d ON d.id=u.department_id ORDER BY u.id`
      )
      .all()
  );
});

userRouter.post("/", requireModule("SYS_USER_MASTER", "edit"), (req, res) => {
  const { username, password, full_name, profile_id, department_id } = req.body;
  if (!username || !password || !full_name || !profile_id) return res.status(400).json({ error: "Missing fields" });
  const hash = bcrypt.hashSync(password, 8);
  try {
    const info = db
      .prepare(`INSERT INTO users (username, password_hash, full_name, profile_id, department_id) VALUES (?,?,?,?,?)`)
      .run(username, hash, full_name, profile_id, department_id || null);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

userRouter.put("/:id", requireModule("SYS_USER_MASTER", "edit"), (req, res) => {
  const { full_name, profile_id, department_id, active } = req.body;
  db.prepare(`UPDATE users SET full_name=?, profile_id=?, department_id=?, active=? WHERE id=?`).run(
    full_name, profile_id, department_id || null, active ? 1 : 0, req.params.id
  );
  res.json({ ok: true });
});

module.exports = { departmentRouter: router, userRouter };
