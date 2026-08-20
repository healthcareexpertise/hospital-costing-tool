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
  const [tests, setTests] = useState([]);
  const [overhead, setOverhead] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newRow, setNewRow] = useState(null);
  const [overheadDraft, setOverheadDraft] = useState(null);
  const [savedOverhead, setSavedOverhead] = useState(false);
  const canEdit = can(`${deptCode}_MASTER`, "edit");

  function load() {
    api.get(`/test-master/${deptCode}/tests`).then(setTests);
    api.get(`/test-master/${deptCode}/overhead`).then(setOverhead);
  }
  useEffect(load, [deptCode]);

  function startEdit(t) {
    setEditingId(t.id);
    setDraft({ test_name: t.test_name, direct_cost: t.direct_cost, doctor_fee: t.doctor_fee, notes: t.notes });
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
    await api.post(`/test-master/${deptCode}/tests`, newRow);
    setNewRow(null);
    load();
  }

  function startOverheadEdit() {
    setOverheadDraft({ ...(overhead || {}) });
  }
  async function saveOverhead() {
    await api.put(`/test-master/${deptCode}/overhead`, overheadDraft);
    setOverheadDraft(null);
    setSavedOverhead(true);
    load();
    setTimeout(() => setSavedOverhead(false), 2000);
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">{deptCode} — Test Master ({tests.length} tests) {canEdit ? "" : <span className="badge" style={{ marginLeft: 8 }}>View only</span>}</p>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
          Direct Cost = reagent/consumable cost specific to this test. Doctor Fee = physician/radiologist reading fee,
          where directly attributable. Shared department overhead (Manpower/Equipment/Building/Power/Common
          Consumables) is set once below and applied to every test automatically.
        </p>
        {canEdit && !newRow && (
          <button className="secondary" style={{ marginBottom: 10 }} onClick={() => setNewRow({ test_name: "", direct_cost: 0, doctor_fee: 0, notes: "" })}>
            + Add test
          </button>
        )}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sl No</th><th>Test Name</th><th>Direct Cost (Rs.)</th><th>Doctor Fee (Rs.)</th><th>Notes</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {newRow && (
                <tr>
                  <td style={{ color: "var(--text-muted)" }}>(auto)</td>
                  <td><input value={newRow.test_name} onChange={(e) => setNewRow({ ...newRow, test_name: e.target.value })} style={{ width: "100%" }} /></td>
                  <td><input type="number" value={newRow.direct_cost} onChange={(e) => setNewRow({ ...newRow, direct_cost: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                  <td><input type="number" value={newRow.doctor_fee} onChange={(e) => setNewRow({ ...newRow, doctor_fee: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                  <td><input value={newRow.notes} onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })} style={{ width: "100%" }} /></td>
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
                      <td><input value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ width: "100%" }} /></td>
                      <td><button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button><button className="secondary" onClick={() => setEditingId(null)}>Cancel</button></td>
                    </>
                  ) : (
                    <>
                      <td>{t.sl_no}</td><td>{t.test_name}</td><td>₹{t.direct_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>₹{t.doctor_fee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td>{t.notes}</td>
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

      <div className="card" style={{ maxWidth: 620 }}>
        <p className="card-title">Shared department overhead</p>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
          Enter the department's <strong>annual total cost</strong> for each component, plus how many tests it
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
              <button className="primary" onClick={saveOverhead} style={{ marginRight: 6 }}>Save</button>
              <button className="secondary" onClick={() => setOverheadDraft(null)}>Cancel</button>
            </div>
          ) : (
            <button className="secondary" style={{ marginTop: 12 }} onClick={startOverheadEdit}>Edit overhead</button>
          )
        )}
        {savedOverhead && <span style={{ marginLeft: 10, color: "var(--primary)", fontSize: 13 }}>Saved ✓</span>}
      </div>
    </div>
  );
}
