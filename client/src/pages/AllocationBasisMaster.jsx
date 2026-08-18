import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AllocationBasisMaster() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [newRow, setNewRow] = useState(null);
  const canEdit = can("SYS_ALLOCATION_BASIS_MASTER", "edit");

  function load() { api.get("/dashboard/allocation-basis-master").then(setRows); }
  useEffect(load, []);

  function startEdit(r) {
    setEditingId(r.id);
    setEditDraft({ classification: r.classification, department_name: r.department_name, cost_component: r.cost_component, basis_of_allocation: r.basis_of_allocation });
  }
  async function saveEdit() {
    await api.put(`/dashboard/allocation-basis-master/${editingId}`, editDraft);
    setEditingId(null);
    load();
  }
  async function saveNew() {
    await api.post("/dashboard/allocation-basis-master", newRow);
    setNewRow(null);
    load();
  }
  async function deleteRow(id) {
    if (!confirm("Delete this allocation rule?")) return;
    await api.del(`/dashboard/allocation-basis-master/${id}`);
    load();
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Allocation Basis Master ({rows.length} rules)</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -6 }}>
          The driver used to apportion each cost component to one case, by department.
        </p>
        {canEdit && !newRow && (
          <button className="secondary" style={{ marginBottom: 10 }} onClick={() => setNewRow({ classification: "", department_name: "", cost_component: "", basis_of_allocation: "" })}>
            + Add rule
          </button>
        )}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Classification</th><th>Department</th><th>Cost Component</th><th>Basis of Allocation</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {newRow && (
                <tr>
                  <td><input value={newRow.classification} onChange={(e) => setNewRow({ ...newRow, classification: e.target.value })} style={{ width: "100%" }} /></td>
                  <td><input value={newRow.department_name} onChange={(e) => setNewRow({ ...newRow, department_name: e.target.value })} style={{ width: "100%" }} /></td>
                  <td><input value={newRow.cost_component} onChange={(e) => setNewRow({ ...newRow, cost_component: e.target.value })} style={{ width: "100%" }} /></td>
                  <td><input value={newRow.basis_of_allocation} onChange={(e) => setNewRow({ ...newRow, basis_of_allocation: e.target.value })} style={{ width: "100%" }} /></td>
                  <td>
                    <button className="primary" onClick={saveNew} style={{ marginRight: 6 }}>Save</button>
                    <button className="secondary" onClick={() => setNewRow(null)}>Cancel</button>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  {editingId === r.id ? (
                    <>
                      <td><input value={editDraft.classification} onChange={(e) => setEditDraft({ ...editDraft, classification: e.target.value })} style={{ width: "100%" }} /></td>
                      <td><input value={editDraft.department_name} onChange={(e) => setEditDraft({ ...editDraft, department_name: e.target.value })} style={{ width: "100%" }} /></td>
                      <td><input value={editDraft.cost_component} onChange={(e) => setEditDraft({ ...editDraft, cost_component: e.target.value })} style={{ width: "100%" }} /></td>
                      <td><input value={editDraft.basis_of_allocation} onChange={(e) => setEditDraft({ ...editDraft, basis_of_allocation: e.target.value })} style={{ width: "100%" }} /></td>
                      <td>
                        <button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button>
                        <button className="secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.classification}</td><td>{r.department_name}</td><td>{r.cost_component}</td><td>{r.basis_of_allocation}</td>
                      {canEdit && (
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="secondary" onClick={() => startEdit(r)} style={{ marginRight: 6 }}>Edit</button>
                          <button className="danger" onClick={() => deleteRow(r.id)}>Delete</button>
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
    </div>
  );
}
