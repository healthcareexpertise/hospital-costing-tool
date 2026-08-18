import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useProcedure } from "../context/ProcedureContext";

export default function SpecialtyMaster() {
  const { can } = useAuth();
  const [specialties, setSpecialties] = useState([]);
  const [form, setForm] = useState({ code: "", name: "" });
  const canEdit = can("SYS_SPECIALTY_MASTER", "edit");

  function load() {
    api.get("/procedures/specialties").then(setSpecialties);
  }
  useEffect(load, []);

  async function createSpecialty(e) {
    e.preventDefault();
    await api.post("/procedures/specialties", form);
    setForm({ code: "", name: "" });
    load();
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Specialty Master ({specialties.length} specialties)</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Order</th></tr></thead>
            <tbody>
              {specialties.map((s) => (
                <tr key={s.id}><td>{s.code}</td><td>{s.name}</td><td>{s.display_order}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <div className="card" style={{ maxWidth: 420 }}>
          <p className="card-title">Add new specialty</p>
          <form onSubmit={createSpecialty}>
            <div className="field">
              <label>Code (short, e.g. ENT)</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="field">
              <label>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <button className="primary">Add specialty</button>
          </form>
        </div>
      )}
    </div>
  );
}
