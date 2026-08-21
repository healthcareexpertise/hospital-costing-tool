import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ProcedureMasterAdmin() {
  const { can } = useAuth();
  const [procedures, setProcedures] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [form, setForm] = useState({ specialty_code: "", code: "", name: "" });
  const [editingCode, setEditingCode] = useState(null);
  const [draft, setDraft] = useState({});
  const canEdit = can("SYS_PROCEDURE_MASTER", "edit");

  function load() {
    api.get("/procedures").then(setProcedures);
    api.get("/procedures/specialties").then(setSpecialties);
  }
  useEffect(load, []);

  async function createProcedure(e) {
    e.preventDefault();
    await api.post("/procedures", form);
    setForm({ specialty_code: "", code: "", name: "" });
    load();
  }

  async function deleteProcedure(id, name) {
    if (!confirm(`Delete "${name}"? This removes all its master data, input settings and reference costs. This cannot be undone.`)) return;
    await api.del(`/procedures/${id}`);
    load();
  }

  async function startEditDefault(p) {
    setEditingCode(p.code);
    const d = await api.get(`/procedures/${p.code}/default-driver`);
    setDraft({ default_hours: d.default_hours ?? "", default_days: d.default_days ?? "" });
  }
  async function saveDefault(code) {
    await api.put(`/procedures/${code}/default-driver`, {
      default_hours: draft.default_hours === "" ? null : Number(draft.default_hours),
      default_days: draft.default_days === "" ? null : Number(draft.default_days),
    });
    setEditingCode(null);
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Procedure (Surgery) Master — {procedures.length} procedures</p>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
          Set the default surgery duration and length of stay <strong>once per procedure</strong> here — every
          department's Input screen inherits whichever applies to its own driver type (hours or days)
          automatically, instead of needing the same figure typed in on every department individually.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Specialty</th><th>Code</th><th>Name</th><th>Default Duration</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {procedures.map((p) => (
                <tr key={p.id}>
                  <td>{p.specialty_name}</td><td>{p.code}</td><td>{p.name}</td>
                  <td>
                    {editingCode === p.code ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="number" placeholder="Hours" value={draft.default_hours} onChange={(e) => setDraft({ ...draft, default_hours: e.target.value })} style={{ width: 80 }} />
                        <span style={{ fontSize: 11 }}>hrs</span>
                        <input type="number" placeholder="Days" value={draft.default_days} onChange={(e) => setDraft({ ...draft, default_days: e.target.value })} style={{ width: 80 }} />
                        <span style={{ fontSize: 11 }}>days</span>
                        <button className="primary" onClick={() => saveDefault(p.code)}>Save</button>
                        <button className="secondary" onClick={() => setEditingCode(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="secondary" onClick={() => startEditDefault(p)}>Set default duration/stay</button>
                    )}
                  </td>
                  {canEdit && <td><button className="danger" onClick={() => deleteProcedure(p.id, p.name)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p className="card-title">Add new procedure (surgery)</p>
          <form onSubmit={createProcedure}>
            <div className="field">
              <label>Specialty</label>
              <select required value={form.specialty_code} onChange={(e) => setForm({ ...form, specialty_code: e.target.value })}>
                <option value="">Select specialty</option>
                {specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Code (unique, e.g. ENT_TONSILLECTOMY)</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="field">
              <label>Procedure name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <button className="primary">Add procedure</button>
          </form>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
            After adding, select it from the procedure dropdown in the top bar, set its default duration/stay
            above, then add Master data for whichever departments it uses — Output and Dashboard work
            immediately once those exist.
          </p>
        </div>
      )}
    </div>
  );
}
