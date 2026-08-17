import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RateTariffMaster() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [val, setVal] = useState("");
  const canEdit = can("SYS_RATE_TARIFF_MASTER", "edit");

  function load() { api.get("/dashboard/rate-tariff-master").then(setRows); }
  useEffect(load, []);

  async function save(id) {
    await api.put(`/dashboard/rate-tariff-master/${id}`, { value: Number(val) });
    setEditingId(null);
    load();
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Rate &amp; Tariff Master (system-wide constants)</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Parameter</th><th>Value</th><th>Applies To</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.param_name}</td>
                  <td>{editingId === r.id ? <input value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 100 }} /> : r.value}</td>
                  <td>{r.applies_to}</td>
                  {canEdit && (
                    <td>
                      {editingId === r.id ? (
                        <>
                          <button className="primary" onClick={() => save(r.id)} style={{ marginRight: 6 }}>Save</button>
                          <button className="secondary" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="secondary" onClick={() => { setEditingId(r.id); setVal(r.value); }}>Edit</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
