import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import { useAuth } from "../context/AuthContext";

const cols = [
  { key: "code", label: "Code", editable: false },
  { key: "name", label: "Name" },
  { key: "classification", label: "Classification" },
  { key: "engine_type", label: "Engine Type" },
  { key: "driver_type", label: "Driver Type" },
  { key: "display_order", label: "Order", type: "number" },
];

export default function DepartmentMaster() {
  const { can, refreshPermissions } = useAuth();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", classification: "Service", engine_type: "FULL", driver_type: "DAYS" });
  const canEdit = can("SYS_DEPARTMENT_MASTER", "edit");

  function load() {
    api.get("/departments").then(setRows);
  }
  useEffect(load, []);

  async function handleSave(id, patch) {
    await api.put(`/departments/${id}`, patch);
    load();
  }

  async function createDepartment(e) {
    e.preventDefault();
    await api.post("/departments", form);
    setForm({ code: "", name: "", classification: "Service", engine_type: "FULL", driver_type: "DAYS" });
    load();
    await refreshPermissions(); // pick up the 4 new auto-granted modules right away for Admin
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Department Master ({rows.length} departments)</p>
        <DataTable columns={cols} rows={rows} canEdit={canEdit} onSave={handleSave} />
      </div>

      {canEdit && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p className="card-title">Add new department</p>
          <form onSubmit={createDepartment}>
            <div className="field">
              <label>Code (short, unique, e.g. RADIOLOGY2)</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="field">
              <label>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Classification</label>
              <select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
                <option>Medical Support</option>
                <option>Service</option>
                <option>Other Costs</option>
              </select>
            </div>
            <div className="field">
              <label>Engine Type</label>
              <select value={form.engine_type} onChange={(e) => setForm({ ...form, engine_type: e.target.value })}>
                <option value="FULL">FULL (Manpower/Materials/Equipment breakdown)</option>
                <option value="SIMPLE">SIMPLE (single capex/opex block)</option>
              </select>
            </div>
            <div className="field">
              <label>Driver Type</label>
              <select value={form.driver_type} onChange={(e) => setForm({ ...form, driver_type: e.target.value })}>
                <option value="HOURS">HOURS (apportioned by procedure duration)</option>
                <option value="DAYS">DAYS (apportioned by length of stay)</option>
              </select>
            </div>
            <button className="primary">Add department</button>
          </form>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
            Its 4 modules (Master/Input/Output/Dashboard) are created automatically and granted to Admin —
            assign them to other profiles from Profile Master.
          </p>
        </div>
      )}
    </div>
  );
}
