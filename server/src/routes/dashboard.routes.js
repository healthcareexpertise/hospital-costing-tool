const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireModule } = require("../middleware/rbac");
const { computeGlobalDashboard } = require("../engine/costEngine");

const router = express.Router();
router.use(requireAuth);

router.get("/global", requireModule("SYS_GLOBAL_DASHBOARD", "view"), (req, res) => {
  try {
    res.json(computeGlobalDashboard());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.get("/rate-tariff-master", requireModule("SYS_RATE_TARIFF_MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM rate_tariff_master").all());
});

router.put("/rate-tariff-master/:id", requireModule("SYS_RATE_TARIFF_MASTER", "edit"), (req, res) => {
  db.prepare("UPDATE rate_tariff_master SET value = ? WHERE id = ?").run(req.body.value, req.params.id);
  res.json({ ok: true });
});

router.get("/allocation-basis-master", requireModule("SYS_ALLOCATION_BASIS_MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM allocation_basis_master ORDER BY id").all());
});

module.exports = router;
