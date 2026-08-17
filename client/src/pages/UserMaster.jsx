import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function UserMaster() {
  const { can } = useAuth();
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", profile_id: "", department_id: "" });
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

  async function toggleActive(u) {
    await api.put(`/users/${u.id}`, { full_name: u.full_name, profile_id: u.profile_id, department_id: null, active: u.active ? 0 : 1 });
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
                  <td>{u.username}</td><td>{u.full_name}</td><td>{u.profile_name}</td>
                  <td>{u.department_name || "—"}</td>
                  <td><span className={`pill ${u.active ? "edit" : "none"}`}>{u.active ? "Active" : "Inactive"}</span></td>
                  {canEdit && <td><button className="secondary" onClick={() => toggleActive(u)}>{u.active ? "Deactivate" : "Activate"}</button></td>}
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
