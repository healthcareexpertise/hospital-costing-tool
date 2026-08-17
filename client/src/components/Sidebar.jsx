import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MODULE_LABELS = { MASTER: "Master", INPUT: "Input", OUTPUT: "Output", DASHBOARD: "Dashboard" };

export default function Sidebar() {
  const { departments, systemModules } = useAuth();

  return (
    <div className="sidebar">
      <div className="sidebar-brand">Hospital Costing Tool</div>

      <div className="sidebar-section">Overview</div>
      {systemModules.find((m) => m.code === "SYS_GLOBAL_DASHBOARD") && (
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Global Cost Dashboard
        </NavLink>
      )}

      {departments.length > 0 && <div className="sidebar-section">Departments</div>}
      {departments.map((d) => (
        <div key={d.code}>
          <div style={{ padding: "8px 16px 2px", fontSize: 12.5, fontWeight: 600 }}>{d.name}</div>
          {["MASTER", "INPUT", "OUTPUT", "DASHBOARD"].map((mt) =>
            d.modules[mt]?.can_view ? (
              <NavLink
                key={mt}
                to={`/dept/${d.code}/${mt.toLowerCase()}`}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
                style={{ paddingLeft: 28 }}
              >
                {MODULE_LABELS[mt]}
              </NavLink>
            ) : null
          )}
        </div>
      ))}

      {systemModules.some((m) => m.code !== "SYS_GLOBAL_DASHBOARD") && <div className="sidebar-section">Administration</div>}
      {systemModules.find((m) => m.code === "SYS_DEPARTMENT_MASTER") && (
        <NavLink to="/admin/departments" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Department Master
        </NavLink>
      )}
      {systemModules.find((m) => m.code === "SYS_PROFILE_MASTER") && (
        <NavLink to="/admin/profiles" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Profile Master
        </NavLink>
      )}
      {systemModules.find((m) => m.code === "SYS_USER_MASTER") && (
        <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          User Master
        </NavLink>
      )}
      {systemModules.find((m) => m.code === "SYS_RATE_TARIFF_MASTER") && (
        <NavLink to="/admin/rates" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Rate &amp; Tariff Master
        </NavLink>
      )}
      {systemModules.find((m) => m.code === "SYS_ALLOCATION_BASIS_MASTER") && (
        <NavLink to="/admin/allocation-basis" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Allocation Basis Master
        </NavLink>
      )}
    </div>
  );
}
