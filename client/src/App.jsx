import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import ProcedureSelector from "./components/ProcedureSelector";
import Login from "./pages/Login";
import GlobalDashboard from "./pages/GlobalDashboard";
import ProfileMaster from "./pages/ProfileMaster";
import DepartmentMaster from "./pages/DepartmentMaster";
import UserMaster from "./pages/UserMaster";
import RateTariffMaster from "./pages/RateTariffMaster";
import AllocationBasisMaster from "./pages/AllocationBasisMaster";
import MasterPage from "./pages/dept/MasterPage";
import InputPage from "./pages/dept/InputPage";
import OutputPage from "./pages/dept/OutputPage";
import DashboardPage from "./pages/dept/DashboardPage";

function Shell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <div className="topbar">
          <div className="topbar-title">Multi-Specialty Hospital Costing Tool</div>
          <ProcedureSelector />
          <div className="topbar-user">
            <span>{user?.full_name}</span>
            <span className="badge">{user?.profile_name}</span>
            <button className="btn-link" onClick={() => { logout(); navigate("/login"); }}>Log out</button>
          </div>
        </div>
        {children}
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
            <Shell>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<GlobalDashboard />} />
                <Route path="/admin/departments" element={<DepartmentMaster />} />
                <Route path="/admin/profiles" element={<ProfileMaster />} />
                <Route path="/admin/users" element={<UserMaster />} />
                <Route path="/admin/rates" element={<RateTariffMaster />} />
                <Route path="/admin/allocation-basis" element={<AllocationBasisMaster />} />
                <Route path="/dept/:deptCode/master" element={<MasterPage />} />
                <Route path="/dept/:deptCode/input" element={<InputPage />} />
                <Route path="/dept/:deptCode/output" element={<OutputPage />} />
                <Route path="/dept/:deptCode/dashboard" element={<DashboardPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
