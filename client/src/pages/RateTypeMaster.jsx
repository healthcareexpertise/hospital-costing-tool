import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RateTypeMaster() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const canEdit = can("SYS_RATE_TYPE_MASTER", "edit");

  function load() { api.get("/dashboard/rate-type-master").then(setRows); }
  useEffect(load, []);

  async function createType(e) {
    e.preventDefault();
    await api.post("/dashboard/rate-type-master", form);
    setForm({ code: "", name: "", description: "" });
    load();
  }
  async function deleteType(id) {
    if (!confirm("Delete this rate type? Manpower rows already using it will keep the old code, but it won't be selectable for new rows.")) return;
    await api.del(`/dashboard/rate-type-master/${id}`);
    load();
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Rate Type Master ({rows.length} types)</p>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
          Defines the ways a Manpower Master row's rate can be interpreted — selectable from the Rate Type dropdown
          when adding or editing a manpower row.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Description</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.code}</td><td>{r.name}</td><td>{r.description}</td>
                  {canEdit && <td><button className="danger" onClick={() => deleteType(r.id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p className="card-title">Add rate type</p>
          <form onSubmit={createType}>
            <div className="field"><label>Code (e.g. PER_VISIT)</label><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div className="field"><label>Display name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <button className="primary">Add rate type</button>
          </form>
        </div>
      )}
    </div>
  );
}
