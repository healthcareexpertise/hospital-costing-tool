import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <p className="login-title">Hospital Costing Tool</p>
        <p className="login-sub">Multi-department procedure costing — sign in</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="hint">
          Demo accounts (password: <code>password123</code>):<br />
          admin · ot.manager · icu.manager · finance.viewer · data.clerk
        </div>
      </div>
    </div>
  );
}
