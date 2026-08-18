import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RateTariffMaster() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [newRow, setNewRow] = useState(null);
  const canEdit = can("SYS_RATE_TARIFF_MASTER", "edit");

  function load() { api.get("/dashboard/rate-tariff-master").then(setRows); }
  useEffect(load, []);

  function startEdit(r) {
    setEditingId(r.id);
    setEditDraft({ param_name: r.param_name, value: r.value, applies_to: r.applies_to });
  }
  async function saveEdit() {
    await api.put(`/dashboard/rate-tariff-master/${editingId}`, editDraft);
    setEditingId(null);
    load();
  }
  async function saveNew() {
    await api.post("/dashboard/rate-tariff-master", newRow);
    setNewRow(null);
    load();
  }
  async function deleteParam(id) {
    if (!confirm("Delete this parameter? Any formula relying on it will need updating.")) return;
    await api.del(`/dashboard/rate-tariff-master/${id}`);
    load();
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Rate &amp; Tariff Master (system-wide constants)</p>
        {canEdit && !newRow && (
          <button className="secondary" style={{ marginBottom: 10 }} onClick={() => setNewRow({ param_code: "", param_name: "", value: 0, applies_to: "" })}>
            + Add parameter
          </button>
        )}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Parameter</th><th>Value</th><th>Applies To</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {newRow && (
                <tr>
                  <td>
                    <input placeholder="Code (e.g. NEW_PARAM)" value={newRow.param_code} onChange={(e) => setNewRow({ ...newRow, param_code: e.target.value })} style={{ width: "100%", marginBottom: 4 }} />
                    <input placeholder="Display name" value={newRow.param_name} onChange={(e) => setNewRow({ ...newRow, param_name: e.target.value })} style={{ width: "100%" }} />
                  </td>
                  <td><input type="number" value={newRow.value} onChange={(e) => setNewRow({ ...newRow, value: Number(e.target.value) })} style={{ width: "100%" }} /></td>
                  <td><input value={newRow.applies_to} onChange={(e) => setNewRow({ ...newRow, applies_to: e.target.value })} style={{ width: "100%" }} /></td>
                  <td>
                    <button className="primary" onClick={saveNew} style={{ marginRight: 6 }}>Save</button>
                    <button className="secondary" onClick={() => setNewRow(null)}>Cancel</button>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{editingId === r.id ? <input value={editDraft.param_name} onChange={(e) => setEditDraft({ ...editDraft, param_name: e.target.value })} style={{ width: "100%" }} /> : r.param_name}</td>
                  <td>{editingId === r.id ? <input type="number" value={editDraft.value} onChange={(e) => setEditDraft({ ...editDraft, value: Number(e.target.value) })} style={{ width: 100 }} /> : r.value}</td>
                  <td>{editingId === r.id ? <input value={editDraft.applies_to} onChange={(e) => setEditDraft({ ...editDraft, applies_to: e.target.value })} style={{ width: "100%" }} /> : r.applies_to}</td>
                  {canEdit && (
                    <td style={{ whiteSpace: "nowrap" }}>
                      {editingId === r.id ? (
                        <>
                          <button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button>
                          <button className="secondary" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="secondary" onClick={() => startEdit(r)} style={{ marginRight: 6 }}>Edit</button>
                          <button className="danger" onClick={() => deleteParam(r.id)}>Delete</button>
                        </>
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
