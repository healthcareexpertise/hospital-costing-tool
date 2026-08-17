# Multi-Specialty Hospital Costing Tool

A full-stack web application for procedure costing across multiple medical specialties,
built from Baby Memorial Hospital's costing workbooks. It generalizes those workbooks'
Master → Input → Output → Dashboard pattern into a proper multi-user application with
role-based module permissions, spanning **4 specialties and 23 procedures**:

- **CTVS**: CABG (On-Pump) — the original build, computed live from a formula engine
- **Cardiology**: Angioplasty, Coronary Angiogram, Device Closure, ECHO, Permanent
  Pacemaker Implantation, TMT
- **Neurosurgery**: Burr Hole Evacuation of SDH, Cranioplasty, Craniotomy (Trauma),
  Craniotomy (Tumours), Decompression Craniectomy + Duroplasty, VP Shunt
- **Urology**: AV Fistula, Lap. Nephrectomy (Partial & Radical), Orchidectomy, P.C.N,
  P.C.N.L, Renal Transplantation (donor & recipient), TURBT, URS

## Architecture

```
client/   React + Vite frontend (SPA)
server/   Node.js + Express REST API, SQLite database (built-in node:sqlite)
```

- **Auth**: JWT-based login. Passwords hashed with bcrypt.
- **Data model**: Specialty → Procedure → Department. A **Department** (OT, ICU, Ward,
  Pharmacy, ...) is a hospital cost centre shared across every procedure; a **Procedure**
  (CABG, Angioplasty, VP Shunt, URS, ...) is a billable package that draws on some subset
  of departments. Every master-data row and Input record is scoped to one
  (procedure, department) pair.
- **RBAC**: Every screen is a "module" (e.g. `OT_MASTER`, `OT_OUTPUT`,
  `SYS_PROFILE_MASTER`). Modules are scoped by **department**, not by procedure — an OT
  Manager can manage OT data across every procedure, switching between them with the
  procedure selector in the top bar, rather than needing separate permissions per
  procedure. The **Profile Master** screen lets an admin assign each profile view/edit
  access to each module. Every API route checks this permission table server-side.
- **Modules per department**: Master (rate-card / asset registers), Input (volume/driver
  values — surgery hours, length of stay), Output (computed 5-cost-head breakdown for the
  selected procedure), Dashboard (charts). Admin has view+edit on all of them.
- **Costing engine** (`server/src/engine/costEngine.js`) has two sources of truth per
  (procedure, department):
  1. **Computed** — CABG only. Recomputes Manpower / Material / Machinery / Expenses /
     Utilities live from Master rows and Input parameters; editing either immediately
     changes the Output.
  2. **Reference** — the 22 Cardiology/Neurosurgery/Urology procedures. These come with
     their own validated procedure-level cost sheets from the hospital, so rather than
     risk drift from re-deriving formulas, the Output for these is read directly from
     that ground truth (`procedure_department_reference` table). Master-data rows are
     still populated and editable for reference, but don't yet feed back into the total
     for these procedures — see Known Limitations.
- **Procedure selector**: a specialty-grouped dropdown in the top bar (persisted in
  `localStorage`) that every Master/Input/Output/Dashboard screen reads from.
- **Global Dashboard**: now a hospital-wide view across all 23 procedures — cost share by
  specialty, top procedures by package cost, and a full sortable/filterable table.

## Data

The database is seeded (`server/src/db/seed.js`) from data extracted out of the
hospital's source workbooks:
- CABG: the original 37-file costing model (see `CABG_Masters_Workbook.xlsx` for the
  standalone reference version of this same data).
- The 22 new procedures: extracted from `Cardiology.rar`, `Neurosurgery.rar`, `URO.rar`
  (each procedure's own department-level cost files, plus its procedure-level top sheet
  used as the reference total).

## Running it

Requires **Node.js 22.5+** (for the built-in `node:sqlite` module — no native compile
step needed, so a plain `npm install` should always work without build tools).

```bash
# 1. Backend
cd server
npm install
npm run seed     # creates & populates server/src/db/costing.db (delete the .db file first to re-run cleanly)
npm start        # http://localhost:4000

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev       # http://localhost:5173  (dev server proxies /api to :4000)
# or: npm run build && npm run preview   for a production build
```

Open http://localhost:5173 and sign in.

### Demo accounts (password: `password123` for all)

| Username         | Profile         | Scope                                                       |
|------------------|-----------------|---------------------------------------------------------------|
| `admin`          | Admin           | View + edit every module, every procedure                    |
| `ot.manager`     | OT Manager      | Full access to OT only (any procedure), + view of Global Dashboard |
| `icu.manager`    | ICU Manager     | Full access to ICU only (any procedure), + view of Global Dashboard |
| `finance.viewer` | Finance Viewer  | View-only on every department's Output + Dashboard, no Master |
| `data.clerk`     | Data Entry Clerk| Edit Master + Input for OT & ICU only, no dashboards            |

Use the **Profile Master** screen (as `admin`) to change any of this.

## Module map

Each of the 35 departments gets 4 modules; system-level modules sit alongside them:
`SYS_GLOBAL_DASHBOARD`, `SYS_DEPARTMENT_MASTER`, `SYS_PROFILE_MASTER`, `SYS_USER_MASTER`,
`SYS_RATE_TARIFF_MASTER`, `SYS_ALLOCATION_BASIS_MASTER`.

## Known limitations / next steps

- **New-specialty Output isn't yet wired to Master edits.** For the 22
  Cardiology/Neurosurgery/Urology procedures, Output reads the hospital's own validated
  reference total rather than recomputing from Master rows (see Architecture above). If
  you edit, say, an equipment cost on VP Shunt's OT Master screen, the Output total won't
  move yet — the reference figure is what's shown, with a note to that effect on the
  Output screen. Wiring these to the same live formula engine CABG uses is the natural
  next step, department-type by department-type.
- **CABG's Global Dashboard total is inflated** by a pre-existing equipment-apportionment
  issue for a few hospital-wide service departments (notably IT, whose ~Rs. 17.5L in shared
  computers/software gets apportioned by CABG's own driver rather than total hospital
  activity). OT/ICU/Ward-level CABG figures are accurate; it's specifically the
  all-department roll-up that's affected. Flagged in the Global Dashboard UI itself.
- **Costing engine fidelity (CABG only)**: Manpower and Material match the original
  spreadsheet almost to the rupee; Machinery/Utilities diverge for a few departments for
  the same apportionment-base reason above.
- **Seed coverage**: the master-data extraction for the new specialties uses fuzzy header
  matching across ~500 files with inconsistent column naming; spot-checked (including a
  pass to strip stray "TOTAL" subtotal rows) but not exhaustively verified row-by-row.
  Reference totals (used for Output) are the reliable ground truth regardless.
- **147-procedure master list**: this build covers the 23 procedures with detailed cost
  sheets in the files provided (CTVS/Cardiology/Neurosurgery/Urology). The hospital's full
  price list spans 147 procedures across 19 specialties (see `surgerylist.xlsx` in the
  `BMH_Hareesh` upload) — extending to the rest follows the same ingestion pattern used
  here (`server/src/db/seed.js` → `seedNewSpecialties()`), once the remaining specialties'
  source files are available.
- **Production hardening not included**: no HTTPS/reverse-proxy config, no refresh
  tokens, no audit trail, no pagination on large tables, no automated tests.
- **Cloud hosting**: not yet done — this build is still local-only, per the sequencing
  agreed on (data model first, hosting once broader). See the chat for a walkthrough of
  free-tier options (Render, Railway) once you're ready for that step.

## Deploying to the cloud (Render, free tier)

The app is already configured to deploy as a **single web service** — `npm run build`
builds the React frontend and has Express serve it directly, so there's one URL, no
separate frontend/backend hosting to coordinate, and (after this one-time setup) no more
commands to run, ever.

1. **Put the code on GitHub** (Render deploys from a Git repo — this is the only way to
   avoid a command line entirely).
   - Go to github.com, sign in or create a free account.
   - Click **New repository**, give it a name (e.g. `hospital-costing-tool`), leave it
     Public or Private, click **Create repository**.
   - On the new repo's page, click **uploading an existing file**, then drag the
     `costingapp` folder's contents (everything inside it — `client/`, `server/`,
     `scripts/`, `package.json`, `render.yaml`, `README.md`, `.gitignore`) into the
     browser window. Commit the upload.
2. **Create a Render account** at render.com (free, no credit card required for the free
   tier at time of writing).
3. Click **New > Blueprint**, connect your GitHub account, and select the repository you
   just created. Render reads `render.yaml` from the repo root and pre-fills everything —
   service name, build command, start command, and a securely auto-generated
   `JWT_SECRET`. Click **Apply**.
4. Wait for the build to finish (a few minutes — it runs `npm install` for both
   client and server, builds the React app, and starts the Node service). Render shows
   build logs live.
5. Once live, Render gives you a URL like `https://hospital-costing-tool.onrender.com`.
   Open it — the database seeds itself automatically on first request (you'll see
   "Fresh database detected — running seed automatically..." in the logs), then the
   login screen loads. Sign in with the same demo accounts as local (`admin` /
   `password123`, etc.) — share the URL with anyone who needs access; no install step for
   them at all.

### Important caveats for this free-tier setup

- **Data persistence**: Render's free tier does not include a persistent disk. The
  SQLite database resets to the seeded starting data on every redeploy, and possibly on
  restart after the service spins down from inactivity. This is fine for evaluating the
  app or giving stakeholders a live demo, but **any edits made through the UI (Master
  data changes, new users, Profile Master permission changes) are not guaranteed to
  survive a restart.** For a deployment where edits need to persist permanently, either:
  - Upgrade the Render service to a paid plan with a persistent disk, and mount it at
    `server/src/db/` (Render's dashboard has a "Disks" tab once you're on a paid plan), or
  - Migrate from SQLite to a hosted Postgres (Render offers a free Postgres instance for
    90 days, permanent on paid plans) — this would need `server/src/db/db.js` rewritten
    against a Postgres client instead of `node:sqlite`, since the two aren't drop-in
    compatible the way `node:sqlite`/`better-sqlite3` were.
- **Free tier sleep**: the service spins down after ~15 minutes of no traffic and takes
  10-30 seconds to wake up on the next request. Fine for a demo; annoying for daily
  production use — the paid "Starter" tier removes this.
- **JWT_SECRET**: `render.yaml` has Render auto-generate a random one on deploy, so
  sessions are properly secured (not using the `dev-secret-change-me` fallback from
  local development).



1. Add a row to `specialties`/`procedures` (via the seed script or the Procedure Master
   API routes in `procedure.routes.js`).
2. Populate `department_input` for each department the procedure uses.
3. Either populate `procedure_department_reference` with validated totals (if you have a
   source cost sheet, like the 22 procedures here), or rely on the live formula engine by
   populating Master rows only (like CABG) — the engine automatically prefers a reference
   row when one exists, and falls back to computing otherwise.
4. It shows up immediately in the procedure selector, Master/Input/Output/Dashboard, and
   the Global Dashboard — no per-procedure UI code needed.
