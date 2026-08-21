import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MODULE_LABELS = { MASTER: "Master", INPUT: "Input", OUTPUT: "Output", DASHBOARD: "Dashboard" };

export default function Sidebar() {
  const { departments, systemModules } = useAuth();
  const location = useLocation();
  const currentDeptCode = location.pathname.match(/^\/dept\/([^/]+)/)?.[1];
  const [openDept, setOpenDept] = useState(currentDeptCode || null);
  const [deptFilter, setDeptFilter] = useState("");

  // Auto-expand whichever department the route navigates to, but afterwards let the
  // user's own click toggle it open/closed freely (that's the part that was broken).
  useEffect(() => {
    if (currentDeptCode) setOpenDept(currentDeptCode);
  }, [currentDeptCode]);

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(deptFilter.toLowerCase())
  );

  function renderDept(d) {
    const isOpen = openDept === d.code;
    return (
      <div key={d.code}>
        <div className="sidebar-dept-toggle" onClick={() => setOpenDept(isOpen ? null : d.code)}>
          <span>{d.name}</span>
          <span style={{ fontSize: 10 }}>{isOpen ? "▾" : "▸"}</span>
        </div>
        {isOpen &&
          ["MASTER", "INPUT", "OUTPUT", "DASHBOARD"].map((mt) =>
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
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-brand">Hospital Costing Tool</div>

      <div className="sidebar-section">Overview</div>
      {systemModules.find((m) => m.code === "SYS_GLOBAL_DASHBOARD") && (
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Global Cost Dashboard
        </NavLink>
      )}

      {departments.length > 0 && (
        <>
          <div className="sidebar-section">Departments</div>
          {departments.length > 8 && (
            <div style={{ padding: "0 16px 8px" }}>
              <input
                placeholder="Filter departments..."
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ width: "100%", fontSize: 12.5 }}
              />
            </div>
          )}
        </>
      )}
      {filteredDepartments.map(renderDept)}

      {systemModules.some((m) => m.code !== "SYS_GLOBAL_DASHBOARD") && <div className="sidebar-section">Administration</div>}
      {systemModules.find((m) => m.code === "SYS_HOSPITAL_PROFILE") && (
        <NavLink to="/admin/hospital" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Hospital Profile
        </NavLink>
      )}
      {systemModules.find((m) => m.code === "SYS_DEPARTMENT_MASTER") && (
        <NavLink to="/admin/departments" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Department Master
        </NavLink>
      )}
      {systemModules.find((m) => m.code === "SYS_SPECIALTY_MASTER") && (
        <NavLink to="/admin/specialties" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Specialty Master
        </NavLink>
      )}
      {systemModules.find((m) => m.code === "SYS_PROCEDURE_MASTER") && (
        <NavLink to="/admin/procedures" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Procedure (Surgery) Master
        </NavLink>
      )}
      {systemModules.find((m) => m.code === "SYS_EMPLOYEE_MASTER") && (
        <NavLink to="/admin/employees" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Employee Master
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
      {systemModules.find((m) => m.code === "SYS_RATE_TYPE_MASTER") && (
        <NavLink to="/admin/rate-types" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Rate Type Master
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
