require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { isNew } = require("./db/db");
if (isNew) {
  // First boot on a fresh database (e.g. a brand new cloud deployment, or an
  // ephemeral free-tier disk that reset) — seed automatically so the service
  // is usable immediately with no manual `npm run seed` step required.
  console.log("Fresh database detected — running seed automatically...");
  require("./db/seed").run();
}

const authRoutes = require("./routes/auth.routes");
const profileRoutes = require("./routes/profile.routes");
const { departmentRouter, userRouter } = require("./routes/department.routes");
const masterRoutes = require("./routes/master.routes");
const inputRoutes = require("./routes/input.routes");
const outputRoutes = require("./routes/output.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const procedureRoutes = require("./routes/procedure.routes");
const employeeRoutes = require("./routes/employee.routes");
const testMasterRoutes = require("./routes/testmaster.routes");
const hospitalRoutes = require("./routes/hospital.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/departments", departmentRouter);
app.use("/api/users", userRouter);
app.use("/api/master", masterRoutes);
app.use("/api/input", inputRoutes);
app.use("/api/output", outputRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/procedures", procedureRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/test-master", testMasterRoutes);
app.use("/api/hospitals", hospitalRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true, name: "Hospital Costing Tool API" }));

// Serve the built React frontend (client/dist), copied to server/public at deploy time,
// so the whole app is one web service with one URL — see the root build script.
const clientDist = path.join(__dirname, "..", "public");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Costing app listening on http://localhost:${PORT}`));
