import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const OVERHEAD_FIELDS = [
  ["manpower_annual_total", "Manpower"],
  ["equipment_annual_total", "Equipment"],
  ["building_annual_total", "Building"],
  ["power_annual_total", "Power"],
  ["common_consumables_annual_total", "Common Consumables"],
];

export default function TestMasterPage() {
  const { deptCode } = useParams();
  const { can } = useAuth();
  const canEdit = can(`${deptCode}_MASTER`, "edit");

  const [subDepts, setSubDepts] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [view, setView] = useState("tests"); // tests | reagents | equipment | overhead

  useEffect(() => {
    api.get(`/test-master/${deptCode}/sub-departments`).then((d) => {
      setSubDepts(d);
      if (d.length && !activeSub) setActiveSub(d[0]);
    });
  }, [deptCode]);

  if (!subDepts.length) return <div className="content">Loading...</div>;

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">{deptCode} — Master {canEdit ? "" : <span className="badge" style={{ marginLeft: 8 }}>View only</span>}</p>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
          Grouped by sub-department, since {deptCode === "LABORATORY" ? "Lab" : "Radiology"} covers several
          specialties under one department. Pick a sub-department, then a screen below.
        </p>
        <div className="tabs">
          {subDepts.map((s) => (
            <div key={s} className={`tab${activeSub === s ? " active" : ""}`} onClick={() => setActiveSub(s)}>{s}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[["tests", "Tests"], ["reagents", "Reagent Master"], ["equipment", "Equipment Master"], ["overhead", "Shared Overhead"]].map(([k, label]) => (
            <button key={k} className={view === k ? "primary" : "secondary"} onClick={() => setView(k)}>{label}</button>
          ))}
        </div>
      </div>

      {activeSub && view === "tests" && <TestsTab deptCode={deptCode} subDept={activeSub} canEdit={canEdit} />}
      {activeSub && view === "reagents" && <ReagentsTab deptCode={deptCode} subDept={activeSub} canEdit={canEdit} />}
      {activeSub && view === "equipment" && <EquipmentTab deptCode={deptCode} subDept={activeSub} canEdit={canEdit} />}
      {activeSub && view === "overhead" && <OverheadTab deptCode={deptCode} subDept={activeSub} canEdit={canEdit} />}
    </div>
  );
}

function TestsTab({ deptCode, subDept, canEdit }) {
  const [tests, setTests] = useState([]);
  const [reagents, setReagents] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newRow, setNewRow] = useState(null);

  function load() {
    api.get(`/test-master/${deptCode}/tests?sub_department=${encodeURIComponent(subDept)}`).then(setTests);
    api.get(`/test-master/${deptCode}/reagents?sub_department=${encodeURIComponent(subDept)}`).then(setReagents);
    api.get(`/test-master/${deptCode}/equipment?sub_department=${encodeURIComponent(subDept)}`).then(setEquipment);
  }
  useEffect(load, [deptCode, subDept]);

  function startEdit(t) {
    setEditingId(t.id);
    setDraft({ test_name: t.test_name, direct_cost: t.direct_cost, doctor_fee: t.doctor_fee, reagent_id: t.reagent_id || "", equipment_id: t.equipment_id || "", notes: t.notes });
  }
  async function saveEdit() {
    await api.put(`/test-master/${deptCode}/tests/${editingId}`, draft);
    setEditingId(null);
    load();
  }
  async function deleteTest(id) {
    if (!confirm("Delete this test? Remaining Sl. No values will renumber automatically.")) return;
    await api.del(`/test-master/${deptCode}/tests/${id}`);
    load();
  }
  async function saveNew() {
    await api.post(`/test-master/${deptCode}/tests`, { ...newRow, sub_department: subDept });
    setNewRow(null);
    load();
  }

  const reagentName = (id) => reagents.find((r) => r.id === id)?.item_name || "—";
  const equipName = (id) => equipment.find((e) => e.id === id)?.equipment_name || "—";

  return (
    <div className="card">
      <p className="card-title">{subDept} — Tests ({tests.length})</p>
      {canEdit && !newRow && (
        <button className="secondary" style={{ marginBottom: 10 }} onClick={() => setNewRow({ test_name: "", direct_cost: 0, doctor_fee: 0, reagent_id: "", equipment_id: "", notes: "" })}>
          + Add test
        </button>
      )}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Sl No</th><th>Test Name</th><th>Direct Cost</th><th>Doctor Fee</th><th>Reagent</th><th>Equipment</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {newRow && (
              <tr>
                <td style={{ color: "var(--text-muted)" }}>(auto)</td>
                <td><input value={newRow.test_name} onChange={(e) => setNewRow({ ...newRow, test_name: e.target.value })} style={{ width: "100%" }} /></td>
                <td><input type="number" value={newRow.direct_cost} onChange={(e) => setNewRow({ ...newRow, direct_cost: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                <td><input type="number" value={newRow.doctor_fee} onChange={(e) => setNewRow({ ...newRow, doctor_fee: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                <td>
                  <select value={newRow.reagent_id} onChange={(e) => setNewRow({ ...newRow, reagent_id: e.target.value })}>
                    <option value="">— None —</option>
                    {reagents.map((r) => <option key={r.id} value={r.id}>{r.item_name}</option>)}
                  </select>
                </td>
                <td>
                  <select value={newRow.equipment_id} onChange={(e) => setNewRow({ ...newRow, equipment_id: e.target.value })}>
                    <option value="">— None —</option>
                    {equipment.map((e) => <option key={e.id} value={e.id}>{e.equipment_name}</option>)}
                  </select>
                </td>
                <td><button className="primary" onClick={saveNew} style={{ marginRight: 6 }}>Save</button><button className="secondary" onClick={() => setNewRow(null)}>Cancel</button></td>
              </tr>
            )}
            {tests.map((t) => (
              <tr key={t.id}>
                {editingId === t.id ? (
                  <>
                    <td style={{ color: "var(--text-muted)" }}>{t.sl_no}</td>
                    <td><input value={draft.test_name} onChange={(e) => setDraft({ ...draft, test_name: e.target.value })} style={{ width: "100%" }} /></td>
                    <td><input type="number" value={draft.direct_cost} onChange={(e) => setDraft({ ...draft, direct_cost: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                    <td><input type="number" value={draft.doctor_fee} onChange={(e) => setDraft({ ...draft, doctor_fee: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                    <td>
                      <select value={draft.reagent_id} onChange={(e) => setDraft({ ...draft, reagent_id: e.target.value })}>
                        <option value="">— None —</option>
                        {reagents.map((r) => <option key={r.id} value={r.id}>{r.item_name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={draft.equipment_id} onChange={(e) => setDraft({ ...draft, equipment_id: e.target.value })}>
                        <option value="">— None —</option>
                        {equipment.map((e) => <option key={e.id} value={e.id}>{e.equipment_name}</option>)}
                      </select>
                    </td>
                    <td><button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button><button className="secondary" onClick={() => setEditingId(null)}>Cancel</button></td>
                  </>
                ) : (
                  <>
                    <td>{t.sl_no}</td><td>{t.test_name}</td>
                    <td>₹{t.direct_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>₹{t.doctor_fee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{reagentName(t.reagent_id)}</td><td>{equipName(t.equipment_id)}</td>
                    {canEdit && (
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="secondary" onClick={() => startEdit(t)} style={{ marginRight: 6 }}>Edit</button>
                        <button className="danger" onClick={() => deleteTest(t.id)}>Delete</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReagentsTab({ deptCode, subDept, canEdit }) {
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newRow, setNewRow] = useState(null);

  function load() { api.get(`/test-master/${deptCode}/reagents?sub_department=${encodeURIComponent(subDept)}`).then(setRows); }
  useEffect(load, [deptCode, subDept]);

  function startEdit(r) { setEditingId(r.id); setDraft({ item_name: r.item_name, kit_cost: r.kit_cost, tests_per_kit: r.tests_per_kit, notes: r.notes }); }
  async function saveEdit() { await api.put(`/test-master/${deptCode}/reagents/${editingId}`, draft); setEditingId(null); load(); }
  async function del(id) { if (!confirm("Delete this reagent? Tests linked to it will keep their existing Direct Cost, just unlinked.")) return; await api.del(`/test-master/${deptCode}/reagents/${id}`); load(); }
  async function saveNew() { await api.post(`/test-master/${deptCode}/reagents`, { ...newRow, sub_department: subDept }); setNewRow(null); load(); }

  return (
    <div className="card">
      <p className="card-title">{subDept} — Reagent Master ({rows.length})</p>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
        Cost per test = Kit Cost ÷ Tests per Kit, computed automatically. Link a test to a reagent from the Tests tab.
      </p>
      {canEdit && !newRow && <button className="secondary" style={{ marginBottom: 10 }} onClick={() => setNewRow({ item_name: "", kit_cost: 0, tests_per_kit: 1, notes: "" })}>+ Add reagent</button>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Kit Cost (Rs.)</th><th>Tests per Kit</th><th>Cost / Test</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {newRow && (
              <tr>
                <td><input value={newRow.item_name} onChange={(e) => setNewRow({ ...newRow, item_name: e.target.value })} style={{ width: "100%" }} /></td>
                <td><input type="number" value={newRow.kit_cost} onChange={(e) => setNewRow({ ...newRow, kit_cost: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                <td><input type="number" value={newRow.tests_per_kit} onChange={(e) => setNewRow({ ...newRow, tests_per_kit: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                <td>₹{(newRow.tests_per_kit ? newRow.kit_cost / newRow.tests_per_kit : 0).toFixed(2)}</td>
                <td><button className="primary" onClick={saveNew} style={{ marginRight: 6 }}>Save</button><button className="secondary" onClick={() => setNewRow(null)}>Cancel</button></td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                {editingId === r.id ? (
                  <>
                    <td><input value={draft.item_name} onChange={(e) => setDraft({ ...draft, item_name: e.target.value })} style={{ width: "100%" }} /></td>
                    <td><input type="number" value={draft.kit_cost} onChange={(e) => setDraft({ ...draft, kit_cost: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                    <td><input type="number" value={draft.tests_per_kit} onChange={(e) => setDraft({ ...draft, tests_per_kit: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                    <td>₹{(draft.tests_per_kit ? draft.kit_cost / draft.tests_per_kit : 0).toFixed(2)}</td>
                    <td><button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button><button className="secondary" onClick={() => setEditingId(null)}>Cancel</button></td>
                  </>
                ) : (
                  <>
                    <td>{r.item_name}</td><td>₹{r.kit_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{r.tests_per_kit}</td><td>₹{r.cost_per_test.toFixed(2)}</td>
                    {canEdit && <td><button className="secondary" onClick={() => startEdit(r)} style={{ marginRight: 6 }}>Edit</button><button className="danger" onClick={() => del(r.id)}>Delete</button></td>}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EquipmentTab({ deptCode, subDept, canEdit }) {
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newRow, setNewRow] = useState(null);

  function load() { api.get(`/test-master/${deptCode}/equipment?sub_department=${encodeURIComponent(subDept)}`).then(setRows); }
  useEffect(load, [deptCode, subDept]);

  function startEdit(r) { setEditingId(r.id); setDraft({ equipment_name: r.equipment_name, cost_price: r.cost_price, life_years: r.life_years, notes: r.notes }); }
  async function saveEdit() { await api.put(`/test-master/${deptCode}/equipment/${editingId}`, draft); setEditingId(null); load(); }
  async function del(id) { if (!confirm("Delete this equipment? Tests linked to it will keep their existing cost, just unlinked.")) return; await api.del(`/test-master/${deptCode}/equipment/${id}`); load(); }
  async function saveNew() { await api.post(`/test-master/${deptCode}/equipment`, { ...newRow, sub_department: subDept }); setNewRow(null); load(); }

  return (
    <div className="card">
      <p className="card-title">{subDept} — Equipment Master ({rows.length})</p>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
        Which machine each test runs on. Link a test to one from the Tests tab.
      </p>
      {canEdit && !newRow && <button className="secondary" style={{ marginBottom: 10 }} onClick={() => setNewRow({ equipment_name: "", cost_price: 0, life_years: 7, notes: "" })}>+ Add equipment</button>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Equipment Name</th><th>Cost Price (Rs.)</th><th>Life (Yrs)</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {newRow && (
              <tr>
                <td><input value={newRow.equipment_name} onChange={(e) => setNewRow({ ...newRow, equipment_name: e.target.value })} style={{ width: "100%" }} /></td>
                <td><input type="number" value={newRow.cost_price} onChange={(e) => setNewRow({ ...newRow, cost_price: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                <td><input type="number" value={newRow.life_years} onChange={(e) => setNewRow({ ...newRow, life_years: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                <td><button className="primary" onClick={saveNew} style={{ marginRight: 6 }}>Save</button><button className="secondary" onClick={() => setNewRow(null)}>Cancel</button></td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                {editingId === r.id ? (
                  <>
                    <td><input value={draft.equipment_name} onChange={(e) => setDraft({ ...draft, equipment_name: e.target.value })} style={{ width: "100%" }} /></td>
                    <td><input type="number" value={draft.cost_price} onChange={(e) => setDraft({ ...draft, cost_price: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                    <td><input type="number" value={draft.life_years} onChange={(e) => setDraft({ ...draft, life_years: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                    <td><button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button><button className="secondary" onClick={() => setEditingId(null)}>Cancel</button></td>
                  </>
                ) : (
                  <>
                    <td>{r.equipment_name}</td><td>₹{r.cost_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td>{r.life_years}</td>
                    {canEdit && <td><button className="secondary" onClick={() => startEdit(r)} style={{ marginRight: 6 }}>Edit</button><button className="danger" onClick={() => del(r.id)}>Delete</button></td>}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverheadTab({ deptCode, subDept, canEdit }) {
  const [overhead, setOverhead] = useState(null);
  const [overheadDraft, setOverheadDraft] = useState(null);
  const [saved, setSaved] = useState(false);

  function load() { api.get(`/test-master/${deptCode}/overhead?sub_department=${encodeURIComponent(subDept)}`).then(setOverhead); }
  useEffect(load, [deptCode, subDept]);

  function startEdit() { setOverheadDraft({ ...(overhead || { actual_volume: 1, standard_volume: 1 }) }); }
  async function save() {
    await api.put(`/test-master/${deptCode}/overhead?sub_department=${encodeURIComponent(subDept)}`, overheadDraft);
    setOverheadDraft(null);
    setSaved(true);
    load();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <p className="card-title">{subDept} — Shared Overhead</p>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
        Enter the sub-department's <strong>annual total cost</strong> for each component, plus how many tests it
        covers in a year — both real recorded volume ("Actual") and rated machine capacity ("Standard"). The
        per-test rate below is <strong>computed live</strong> as total ÷ volume, exactly like the source
        spreadsheet — change the volume for a different hospital and every test's cost recalculates automatically.
      </p>
      {overhead?.notes && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{overhead.notes}</p>}
      <table>
        <thead><tr><th>Component</th><th>Annual Total (Rs.)</th></tr></thead>
        <tbody>
          {OVERHEAD_FIELDS.map(([key, label]) => (
            <tr key={key}>
              <td>{label}</td>
              <td>
                {overheadDraft ? (
                  <input type="number" value={overheadDraft[key] || 0} onChange={(e) => setOverheadDraft({ ...overheadDraft, [key]: Number(e.target.value) })} style={{ width: 140 }} />
                ) : (
                  `₹${(overhead?.[key] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                )}
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: 600 }}>Annual Total (all components)</td>
            <td style={{ fontWeight: 600 }}>₹{(overhead?.annual_total || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Actual test volume (tests/year)</label>
          {overheadDraft ? (
            <input type="number" value={overheadDraft.actual_volume || 1} onChange={(e) => setOverheadDraft({ ...overheadDraft, actual_volume: Number(e.target.value) })} />
          ) : (
            <input value={Math.round(overhead?.actual_volume || 1).toLocaleString()} disabled />
          )}
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Standard capacity (tests/year)</label>
          {overheadDraft ? (
            <input type="number" value={overheadDraft.standard_volume || 1} onChange={(e) => setOverheadDraft({ ...overheadDraft, standard_volume: Number(e.target.value) })} />
          ) : (
            <input value={Math.round(overhead?.standard_volume || 1).toLocaleString()} disabled />
          )}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginTop: 12 }}>
        <div className="metric">
          <p className="metric-label">Computed overhead / test (actual)</p>
          <p className="metric-value">₹{(overhead?.overhead_per_test_actual || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Computed overhead / test (standard)</p>
          <p className="metric-value">₹{(overhead?.overhead_per_test_standard || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {canEdit && (
        overheadDraft ? (
          <div style={{ marginTop: 12 }}>
            <button className="primary" onClick={save} style={{ marginRight: 6 }}>Save</button>
            <button className="secondary" onClick={() => setOverheadDraft(null)}>Cancel</button>
          </div>
        ) : (
          <button className="secondary" style={{ marginTop: 12 }} onClick={startEdit}>Edit overhead</button>
        )
      )}
      {saved && <span style={{ marginLeft: 10, color: "var(--primary)", fontSize: 13 }}>Saved ✓</span>}
    </div>
  );
}
