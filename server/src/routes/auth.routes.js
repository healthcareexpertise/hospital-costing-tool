const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../db/db");
const { requireAuth, SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare(
      `SELECT u.*, p.name as profile_name FROM users u JOIN profiles p ON p.id = u.profile_id
       WHERE u.username = ? AND u.active = 1`
    )
    .get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name, profile_id: user.profile_id, profile_name: user.profile_name },
    SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, profile_name: user.profile_name } });
});

// Returns the caller's full permission map, used by the frontend to build the sidebar/routes
router.get("/me/permissions", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.code, m.name, m.module_type, m.department_id, d.name as department_name, d.code as department_code,
              pmp.can_view, pmp.can_edit
       FROM profile_module_permissions pmp
       JOIN modules m ON m.id = pmp.module_id
       LEFT JOIN departments d ON d.id = m.department_id
       WHERE pmp.profile_id = ? AND pmp.can_view = 1
       ORDER BY d.display_order, m.module_type`
    )
    .all(req.user.profile_id);
  res.json({ user: req.user, permissions: rows });
});

// Self-service: change your own name/password
router.put("/me", requireAuth, (req, res) => {
  const { full_name, current_password, new_password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (new_password) {
    if (!current_password || !bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const hash = bcrypt.hashSync(new_password, 8);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  }
  if (full_name) {
    db.prepare("UPDATE users SET full_name = ? WHERE id = ?").run(full_name, user.id);
  }
  res.json({ ok: true });
});

module.exports = router;
