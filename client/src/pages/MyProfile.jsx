import React, { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function MyProfile() {
  const { user, refreshPermissions } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation don't match");
      return;
    }
    try {
      await api.put("/auth/me", {
        full_name: fullName,
        current_password: newPassword ? currentPassword : undefined,
        new_password: newPassword || undefined,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
      await refreshPermissions();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="content">
      <div className="card" style={{ maxWidth: 440 }}>
        <p className="card-title">My Profile</p>
        <form onSubmit={save}>
          <div className="field">
            <label>Username</label>
            <input value={user?.username || ""} disabled />
          </div>
          <div className="field">
            <label>Profile</label>
            <input value={user?.profile_name || ""} disabled />
          </div>
          <div className="field">
            <label>Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Change password (optional)</p>
          <div className="field">
            <label>Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="primary">Save changes</button>
          {saved && <span style={{ marginLeft: 10, color: "var(--primary)", fontSize: 13 }}>Saved ✓</span>}
        </form>
      </div>
    </div>
  );
}
