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

router.post("/", requireModule("SYS_DEPARTMENT_MASTER", "edit"), (req, res) => {
  const { code, name, classification, engine_type, driver_type, display_order } = req.body;
  if (!code || !name) return res.status(400).json({ error: "code and name are required" });
  try {
    const maxOrder = db.prepare("SELECT MAX(display_order) m FROM departments").get().m || 0;
    const info = db.prepare(
      `INSERT INTO departments (code, name, classification, engine_type, driver_type, display_order) VALUES (?,?,?,?,?,?)`
    ).run(code.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), name, classification || "Service", engine_type || "FULL", driver_type || "DAYS", display_order || maxOrder + 1);
    const deptId = info.lastInsertRowid;
    const deptCode = code.toUpperCase().replace(/[^A-Z0-9]+/g, "_");

    // Auto-create the 4 standard modules for this department, same as the seed script does
    const insertModule = db.prepare(`INSERT OR IGNORE INTO modules (code, name, module_type, department_id) VALUES (?,?,?,?)`);
    [["MASTER", "Master"], ["INPUT", "Input"], ["OUTPUT", "Output"], ["DASHBOARD", "Dashboard"]].forEach(([type, label]) => {
      insertModule.run(`${deptCode}_${type}`, `${name} - ${label}`, type, deptId);
    });
    // Grant Admin full access to the new modules automatically
    const adminProfile = db.prepare("SELECT id FROM profiles WHERE name = 'Admin'").get();
    if (adminProfile) {
      const newModules = db.prepare("SELECT id FROM modules WHERE department_id = ?").all(deptId);
      const setPerm = db.prepare(`INSERT OR REPLACE INTO profile_module_permissions (profile_id, module_id, can_view, can_edit) VALUES (?,?,1,1)`);
      newModules.forEach((m) => setPerm.run(adminProfile.id, m.id));
    }
    res.status(201).json({ id: deptId, code: deptCode });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
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
        `SELECT u.id, u.username, u.full_name, u.active, p.name as profile_name, p.id as profile_id, d.id as department_id, d.name as department_name
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
    full_name, profile_id, department_id === undefined ? null : department_id, active ? 1 : 0, req.params.id
  );
  res.json({ ok: true });
});

module.exports = { departmentRouter: router, userRouter };
