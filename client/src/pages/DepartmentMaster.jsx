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
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const canEdit = can("SYS_DEPARTMENT_MASTER", "edit");

  function load() {
    api.get("/departments").then(setRows);
  }
  useEffect(load, []);

  async function handleSave(id, patch) {
    await api.put(`/departments/${id}`, patch);
    load();
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Department Master ({rows.length} departments)</p>
        <DataTable columns={cols} rows={rows} canEdit={canEdit} onSave={handleSave} />
      </div>
    </div>
  );
}
