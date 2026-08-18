import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function UserMaster() {
  const { can } = useAuth();
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", profile_id: "", department_id: "" });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const canEdit = can("SYS_USER_MASTER", "edit");

  function load() {
    api.get("/users").then(setUsers);
    api.get("/profiles").then(setProfiles).catch(() => {});
    api.get("/departments").then(setDepartments).catch(() => {});
  }
  useEffect(load, []);

  async function createUser(e) {
    e.preventDefault();
    await api.post("/users", { ...form, profile_id: Number(form.profile_id), department_id: form.department_id ? Number(form.department_id) : null });
    setForm({ username: "", password: "", full_name: "", profile_id: "", department_id: "" });
    load();
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditDraft({ full_name: u.full_name, profile_id: u.profile_id, department_id: u.department_id || "", active: u.active });
  }
  async function saveEdit() {
    await api.put(`/users/${editingId}`, {
      full_name: editDraft.full_name,
      profile_id: Number(editDraft.profile_id),
      department_id: editDraft.department_id ? Number(editDraft.department_id) : null,
      active: editDraft.active,
    });
    setEditingId(null);
    load();
  }
  async function toggleActive(u) {
    await api.put(`/users/${u.id}`, { full_name: u.full_name, profile_id: u.profile_id, department_id: u.department_id || null, active: u.active ? 0 : 1 });
    load();
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">User Master</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Username</th><th>Full Name</th><th>Profile</th><th>Department</th><th>Active</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  {editingId === u.id ? (
                    <>
                      <td><input value={editDraft.full_name} onChange={(e) => setEditDraft({ ...editDraft, full_name: e.target.value })} style={{ width: "100%" }} /></td>
                      <td>
                        <select value={editDraft.profile_id} onChange={(e) => setEditDraft({ ...editDraft, profile_id: e.target.value })}>
                          {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={editDraft.department_id} onChange={(e) => setEditDraft({ ...editDraft, department_id: e.target.value })}>
                          <option value="">None</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={editDraft.active ? "1" : "0"} onChange={(e) => setEditDraft({ ...editDraft, active: e.target.value === "1" })}>
                          <option value="1">Active</option>
                          <option value="0">Inactive</option>
                        </select>
                      </td>
                      <td>
                        <button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button>
                        <button className="secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{u.full_name}</td><td>{u.profile_name}</td>
                      <td>{u.department_name || "—"}</td>
                      <td><span className={`pill ${u.active ? "edit" : "none"}`}>{u.active ? "Active" : "Inactive"}</span></td>
                      {canEdit && (
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="secondary" onClick={() => startEdit(u)} style={{ marginRight: 6 }}>Edit</button>
                          <button className="secondary" onClick={() => toggleActive(u)}>{u.active ? "Deactivate" : "Activate"}</button>
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

      {canEdit && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p className="card-title">Create user</p>
          <form onSubmit={createUser}>
            <div className="field"><label>Username</label><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="field"><label>Password</label><input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="field"><label>Full name</label><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="field">
              <label>Profile</label>
              <select required value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })}>
                <option value="">Select profile</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Home department (optional)</label>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button className="primary">Create user</button>
          </form>
        </div>
      )}
    </div>
  );
}
