import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function HospitalProfile() {
  const { can } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const canEdit = can("SYS_HOSPITAL_PROFILE", "edit") || can("SYS_DEPARTMENT_MASTER", "edit"); // Admin implicitly can

  function load() {
    api.get("/hospitals/me").then((h) => { setHospital(h); setForm(h); });
  }
  useEffect(load, []);

  async function save(e) {
    e.preventDefault();
    await api.put("/hospitals/me", form);
    setSaved(true);
    load();
    setTimeout(() => setSaved(false), 2000);
  }

  if (!form) return <div className="content">Loading...</div>;

  return (
    <div className="content">
      <div className="card" style={{ maxWidth: 560 }}>
        <p className="card-title">Hospital Profile</p>
        <form onSubmit={save}>
          <div className="field"><label>Hospital Code</label><input value={hospital?.code || ""} disabled /></div>
          <div className="field"><label>Hospital Name</label><input value={form.name || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Address</label><input value={form.address || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="field"><label>City</label><input value={form.city || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="field"><label>State</label><input value={form.state || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          <div className="field"><label>Contact Person</label><input value={form.contact_person || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
          <div className="field"><label>Phone</label><input value={form.phone || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label>Email</label><input value={form.email || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label>No. of Beds</label><input type="number" value={form.bed_count || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, bed_count: Number(e.target.value) })} /></div>
          <div className="field"><label>Established Year</label><input type="number" value={form.established_year || ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, established_year: Number(e.target.value) })} /></div>
          {canEdit && <button className="primary">Save changes</button>}
          {saved && <span style={{ marginLeft: 10, color: "var(--primary)", fontSize: 13 }}>Saved ✓</span>}
        </form>
      </div>
    </div>
  );
}
