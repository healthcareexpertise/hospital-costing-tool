import React from "react";
import { Routes, Route, Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import ProcedureSelector from "./components/ProcedureSelector";
import Login from "./pages/Login";
import GlobalDashboard from "./pages/GlobalDashboard";
import ProfileMaster from "./pages/ProfileMaster";
import DepartmentMaster from "./pages/DepartmentMaster";
import SpecialtyMaster from "./pages/SpecialtyMaster";
import ProcedureMasterAdmin from "./pages/ProcedureMasterAdmin";
import EmployeeMaster from "./pages/EmployeeMaster";
import UserMaster from "./pages/UserMaster";
import RateTariffMaster from "./pages/RateTariffMaster";
import RateTypeMaster from "./pages/RateTypeMaster";
import AllocationBasisMaster from "./pages/AllocationBasisMaster";
import MyProfile from "./pages/MyProfile";
import HospitalProfile from "./pages/HospitalProfile";
import HospitalMaster from "./pages/HospitalMaster";
import DeptRouter from "./pages/dept/DeptRouter";

// Platform admins aren't tied to a hospital at all — they get a minimal shell with just
// the cross-hospital Hospital Master screen, not the normal department/module sidebar.
function PlatformAdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <div className="main-area" style={{ width: "100%" }}>
        <div className="topbar">
          <div className="topbar-title">Hospital Costing Tool — Platform Administration</div>
          <div className="topbar-user">
            <span>{user?.full_name}</span>
            <span className="badge">Platform Admin</span>
            <button className="btn-link" onClick={() => { logout(); navigate("/login"); }}>Log out</button>
          </div>
        </div>
        <HospitalMaster />
      </div>
    </div>
  );
}

function Shell({ children }) {
  const { user, logout, departments, systemModules } = useAuth();
  const navigate = useNavigate();
  const hasNoPermissions = departments.length === 0 && systemModules.length === 0;
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div className="topbar-title">{user?.hospital_name || "Multi-Specialty Hospital Costing Tool"}</div>
          <ProcedureSelector />
          <div className="topbar-user">
            <Link to="/my-profile" className="btn-link" style={{ textDecoration: "none" }}>{user?.full_name}</Link>
            <span className="badge">{user?.profile_name}</span>
            <button className="btn-link" onClick={() => { logout(); navigate("/login"); }}>Log out</button>
          </div>
        </div>
        {hasNoPermissions ? (
          <div className="content">
            <div className="card">
              <p className="card-title">No modules assigned yet</p>
              <p style={{ fontSize: 13.5, color: "var(--text)" }}>
                You're signed in as <strong>{user?.full_name}</strong> with the <strong>{user?.profile_name}</strong> profile,
                but that profile doesn't have any modules assigned to it yet — so there's nothing to show.
              </p>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                Ask an administrator to open <strong>Profile Master</strong>, select the "{user?.profile_name}" profile,
                and tick View (and Edit, if needed) for the modules this profile should have access to.
              </p>
            </div>
          </div>
        ) : children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppBody />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function AppBody() {
  const { user } = useAuth();
  if (user?.is_platform_admin) return <PlatformAdminShell />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<GlobalDashboard />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/admin/hospital" element={<HospitalProfile />} />
        <Route path="/admin/departments" element={<DepartmentMaster />} />
        <Route path="/admin/specialties" element={<SpecialtyMaster />} />
        <Route path="/admin/procedures" element={<ProcedureMasterAdmin />} />
        <Route path="/admin/employees" element={<EmployeeMaster />} />
        <Route path="/admin/profiles" element={<ProfileMaster />} />
        <Route path="/admin/users" element={<UserMaster />} />
        <Route path="/admin/rates" element={<RateTariffMaster />} />
        <Route path="/admin/rate-types" element={<RateTypeMaster />} />
        <Route path="/admin/allocation-basis" element={<AllocationBasisMaster />} />
        <Route path="/dept/:deptCode/master" element={<DeptRouter view="master" />} />
        <Route path="/dept/:deptCode/input" element={<DeptRouter view="input" />} />
        <Route path="/dept/:deptCode/output" element={<DeptRouter view="output" />} />
        <Route path="/dept/:deptCode/dashboard" element={<DeptRouter view="dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  );
}
