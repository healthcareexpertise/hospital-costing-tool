import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function HospitalMaster() {
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState({
    code: "", name: "", city: "", state: "", bed_count: "",
    admin_username: "", admin_password: "", admin_name: "",
  });
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  function load() {
    api.get("/hospitals").then(setHospitals);
  }
  useEffect(load, []);

  async function createHospital(e) {
    e.preventDefault();
    setError("");
    setCreated(null);
    try {
      await api.post("/hospitals", { ...form, bed_count: form.bed_count ? Number(form.bed_count) : null });
      setCreated({ hospital: form.name, username: form.admin_username });
      setForm({ code: "", name: "", city: "", state: "", bed_count: "", admin_username: "", admin_password: "", admin_name: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Hospital Master ({hospitals.length} hospitals on this platform)</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>City</th><th>Beds</th><th>Users</th><th>Departments</th><th>Status</th></tr></thead>
            <tbody>
              {hospitals.map((h) => (
                <tr key={h.id}>
                  <td>{h.code}</td><td>{h.name}</td><td>{h.city}</td><td>{h.bed_count}</td>
                  <td>{h.user_count}</td><td>{h.department_count}</td>
                  <td><span className={`pill ${h.active ? "edit" : "none"}`}>{h.active ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <p className="card-title">Onboard a new hospital</p>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>
          Creates the hospital record, a starter department set (OT, ICU, Ward, Pharmacy, Lab, Radiology, HR,
          Finance, Housekeeping, Security, Maintenance), default Rate &amp; Tariff / Rate Type masters, and this
          hospital's first Admin login — completely isolated from every other hospital's data.
        </p>
        <form onSubmit={createHospital}>
          <div className="field"><label>Hospital Code (short, unique)</label><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="field"><label>Hospital Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="field"><label>State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          <div className="field"><label>No. of Beds</label><input type="number" value={form.bed_count} onChange={(e) => setForm({ ...form, bed_count: e.target.value })} /></div>
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>First Admin login for this hospital</p>
          <div className="field"><label>Username</label><input required value={form.admin_username} onChange={(e) => setForm({ ...form, admin_username: e.target.value })} /></div>
          <div className="field"><label>Password</label><input required type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} /></div>
          <div className="field"><label>Full name</label><input required value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} /></div>
          {error && <div className="error-text">{error}</div>}
          <button className="primary">Create hospital</button>
        </form>
        {created && (
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--primary)" }}>
            "{created.hospital}" created — sign in as "{created.username}" to start configuring it.
          </p>
        )}
      </div>
    </div>
  );
}
