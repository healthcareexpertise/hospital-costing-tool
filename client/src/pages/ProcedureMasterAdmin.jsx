import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ProcedureMasterAdmin() {
  const { can } = useAuth();
  const [procedures, setProcedures] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [form, setForm] = useState({ specialty_code: "", code: "", name: "" });
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

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Procedure (Surgery) Master — {procedures.length} procedures</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Specialty</th><th>Code</th><th>Name</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {procedures.map((p) => (
                <tr key={p.id}>
                  <td>{p.specialty_name}</td><td>{p.code}</td><td>{p.name}</td>
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
            After adding, select it from the procedure dropdown in the top bar, then add Master data and Input
            parameters for whichever departments it uses — Output and Dashboard work immediately once those exist.
          </p>
        </div>
      )}
    </div>
  );
}
