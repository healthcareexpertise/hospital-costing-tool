import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function EmployeeMaster() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ emp_code: "", full_name: "", designation: "", department_id: "", contact: "", monthly_salary: "" });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const canEdit = can("SYS_EMPLOYEE_MASTER", "edit");

  function load() {
    api.get("/employees").then(setRows);
    api.get("/departments").then(setDepartments).catch(() => {});
  }
  useEffect(load, []);

  async function createEmployee(e) {
    e.preventDefault();
    await api.post("/employees", { ...form, department_id: form.department_id ? Number(form.department_id) : null, monthly_salary: form.monthly_salary ? Number(form.monthly_salary) : null });
    setForm({ emp_code: "", full_name: "", designation: "", department_id: "", contact: "", monthly_salary: "" });
    load();
  }

  function startEdit(r) {
    setEditingId(r.id);
    setEditDraft({ emp_code: r.emp_code, full_name: r.full_name, designation: r.designation, department_id: r.department_id, contact: r.contact, monthly_salary: r.monthly_salary });
  }
  async function saveEdit() {
    await api.put(`/employees/${editingId}`, { ...editDraft, department_id: editDraft.department_id ? Number(editDraft.department_id) : null });
    setEditingId(null);
    load();
  }
  async function deleteEmployee(id) {
    if (!confirm("Delete this employee? Any manpower rows linked to them will be unlinked, not deleted.")) return;
    await api.del(`/employees/${id}`);
    load();
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Employee Master ({rows.length} employees)</p>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
          The hospital's HR employee registry. Manpower Master rows in each department can be linked to an
          employee here via the Employee column on that screen.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Emp Code</th><th>Full Name</th><th>Designation</th><th>Department</th><th>Contact</th><th>Monthly Salary</th>{canEdit && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {editingId === r.id ? (
                    <>
                      <td><input value={editDraft.emp_code || ""} onChange={(e) => setEditDraft({ ...editDraft, emp_code: e.target.value })} /></td>
                      <td><input value={editDraft.full_name || ""} onChange={(e) => setEditDraft({ ...editDraft, full_name: e.target.value })} /></td>
                      <td><input value={editDraft.designation || ""} onChange={(e) => setEditDraft({ ...editDraft, designation: e.target.value })} /></td>
                      <td>
                        <select value={editDraft.department_id || ""} onChange={(e) => setEditDraft({ ...editDraft, department_id: e.target.value })}>
                          <option value="">None</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td><input value={editDraft.contact || ""} onChange={(e) => setEditDraft({ ...editDraft, contact: e.target.value })} /></td>
                      <td><input type="number" value={editDraft.monthly_salary || ""} onChange={(e) => setEditDraft({ ...editDraft, monthly_salary: e.target.value })} /></td>
                      <td>
                        <button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button>
                        <button className="secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.emp_code}</td><td>{r.full_name}</td><td>{r.designation}</td><td>{r.department_name || "—"}</td>
                      <td>{r.contact}</td><td>{r.monthly_salary ? `₹${Number(r.monthly_salary).toLocaleString()}` : ""}</td>
                      {canEdit && (
                        <td>
                          <button className="secondary" onClick={() => startEdit(r)} style={{ marginRight: 6 }}>Edit</button>
                          <button className="danger" onClick={() => deleteEmployee(r.id)}>Delete</button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>No employees yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p className="card-title">Add employee</p>
          <form onSubmit={createEmployee}>
            <div className="field"><label>Employee Code</label><input value={form.emp_code} onChange={(e) => setForm({ ...form, emp_code: e.target.value })} /></div>
            <div className="field"><label>Full Name</label><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="field"><label>Designation</label><input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
            <div className="field">
              <label>Department</label>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Contact</label><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
            <div className="field"><label>Monthly Salary (Rs.)</label><input type="number" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} /></div>
            <button className="primary">Add employee</button>
          </form>
        </div>
      )}
    </div>
  );
}
