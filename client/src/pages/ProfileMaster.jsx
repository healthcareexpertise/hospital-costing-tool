import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function ProfileMaster() {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modules, setModules] = useState([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadProfiles(); }, []);

  function loadProfiles() {
    api.get("/profiles").then((data) => {
      setProfiles(data);
      if (data.length && !selected) setSelected(data[0].id);
    });
  }

  useEffect(() => {
    if (selected) {
      api.get(`/profiles/${selected}/modules`).then(setModules);
    }
  }, [selected]);

  function toggle(moduleId, field) {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        const next = { ...m, [field]: m[field] ? 0 : 1 };
        // edit implies view
        if (field === "can_edit" && next.can_edit) next.can_view = 1;
        if (field === "can_view" && !next.can_view) next.can_edit = 0;
        return next;
      })
    );
  }

  async function savePermissions() {
    setSaved(false);
    await api.put(`/profiles/${selected}/modules`, {
      permissions: modules.map((m) => ({ module_id: m.id, can_view: m.can_view, can_edit: m.can_edit })),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function createProfile() {
    if (!newProfileName.trim()) return;
    await api.post("/profiles", { name: newProfileName.trim(), description: "" });
    setNewProfileName("");
    loadProfiles();
  }

  async function deleteProfile(id) {
    if (!confirm("Delete this profile? Users assigned to it will need reassignment.")) return;
    await api.del(`/profiles/${id}`);
    setSelected(null);
    loadProfiles();
  }

  // group modules by department (null = system)
  const grouped = {};
  modules.forEach((m) => {
    const key = m.department_name || "System";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  const currentProfile = profiles.find((p) => p.id === selected);

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Profile Master</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {profiles.map((p) => (
            <button
              key={p.id}
              className={p.id === selected ? "primary" : "secondary"}
              onClick={() => setSelected(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input placeholder="New profile name" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} />
          <button className="secondary" onClick={createProfile}>+ Create profile</button>
          {currentProfile && !currentProfile.is_system && (
            <button className="danger" onClick={() => deleteProfile(currentProfile.id)}>Delete "{currentProfile.name}"</button>
          )}
        </div>
      </div>

      {currentProfile && (
        <div className="card">
          <p className="card-title">
            Module assignment for "{currentProfile.name}"
            {currentProfile.is_system && <span className="badge" style={{ marginLeft: 8 }}>System profile</span>}
          </p>
          {Object.entries(grouped).map(([group, mods]) => (
            <div key={group} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, margin: "10px 0 4px", color: "var(--primary)" }}>{group}</div>
              <table className="perm-grid">
                <thead>
                  <tr><th>Module</th><th style={{ width: 80 }}>View</th><th style={{ width: 80 }}>Edit</th></tr>
                </thead>
                <tbody>
                  {mods.map((m) => (
                    <tr key={m.id}>
                      <td>{m.module_type === "SYSTEM" ? m.name : m.module_type}</td>
                      <td><input type="checkbox" checked={!!m.can_view} onChange={() => toggle(m.id, "can_view")} /></td>
                      <td><input type="checkbox" checked={!!m.can_edit} onChange={() => toggle(m.id, "can_edit")} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <button className="primary" onClick={savePermissions}>Save permissions</button>
          {saved && <span style={{ marginLeft: 10, color: "var(--primary)", fontSize: 13 }}>Saved ✓</span>}
        </div>
      )}
    </div>
  );
}
