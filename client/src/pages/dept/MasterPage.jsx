import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import DataTable from "../../components/DataTable";
import { useAuth } from "../../context/AuthContext";
import { useProcedure } from "../../context/ProcedureContext";

const MASTER_TABS = [
  { key: "manpower", label: "Manpower", cols: [
      { key: "sl_no", label: "Sl No", type: "number" },
      { key: "role", label: "Role / Designation" },
      { key: "category", label: "Category" },
      { key: "no_of_persons", label: "No. of Persons", type: "number" },
      { key: "rate_type", label: "Rate Type" },
      { key: "rate_value", label: "Rate (Rs.)", type: "number" },
  ]},
  { key: "materials", label: "Materials", cols: [
      { key: "sl_no", label: "Sl No", type: "number" },
      { key: "item_name", label: "Item Name" },
      { key: "cost_price_per_unit", label: "Cost/Unit (Rs.)", type: "number" },
      { key: "qty_per_patient", label: "Qty per Patient", type: "number" },
  ]},
  { key: "equipment", label: "Equipment", cols: [
      { key: "sl_no", label: "Sl No", type: "number" },
      { key: "equipment_name", label: "Equipment Name" },
      { key: "cost_price", label: "Cost Price (Rs.)", type: "number" },
      { key: "useful_life_years", label: "Life (Yrs)", type: "number" },
      { key: "no_of_units", label: "Units", type: "number" },
      { key: "scrap_pct", label: "Scrap %", type: "number" },
      { key: "insurance_pct", label: "Insurance %", type: "number" },
      { key: "maintenance_pct", label: "Maintenance %", type: "number" },
  ]},
  { key: "nonmedical", label: "Non-Medical Assets", cols: [
      { key: "sl_no", label: "Sl No", type: "number" },
      { key: "asset_name", label: "Asset Name" },
      { key: "no_of_units", label: "Units", type: "number" },
      { key: "cost_price", label: "Cost Price (Rs.)", type: "number" },
      { key: "useful_life_years", label: "Life (Yrs)", type: "number" },
      { key: "scrap_pct", label: "Scrap %", type: "number" },
  ]},
  { key: "ac", label: "Air Conditioning", cols: [
      { key: "sl_no", label: "Sl No", type: "number" },
      { key: "floor", label: "Floor" },
      { key: "room", label: "Room / Area" },
      { key: "odu_capacity_tr", label: "ODU (TR)", type: "number" },
      { key: "capital_cost", label: "Capital Cost (Rs.)", type: "number" },
      { key: "useful_life_years", label: "Life (Yrs)", type: "number" },
  ]},
  { key: "power", label: "Power Consumption", cols: [
      { key: "sl_no", label: "Sl No", type: "number" },
      { key: "equipment_name", label: "Equipment Name" },
      { key: "power_kw", label: "Power (kW/hr)", type: "number" },
  ]},
  { key: "simple", label: "Simple Assets", cols: [
      { key: "item_name", label: "Item / Parameter" },
      { key: "cost_price", label: "Value", type: "number" },
      { key: "notes", label: "Notes / Unit" },
  ]},
];

export default function MasterPage() {
  const { deptCode } = useParams();
  const { can } = useAuth();
  const { selectedCode, selected } = useProcedure();
  const [activeTab, setActiveTab] = useState("manpower");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEdit = can(`${deptCode}_MASTER`, "edit");
  const q = `?procedure=${encodeURIComponent(selectedCode)}`;

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get(`/master/${deptCode}/${activeTab}${q}`)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [deptCode, activeTab, selectedCode]);

  const tab = MASTER_TABS.find((t) => t.key === activeTab);

  async function handleSave(id, patch) {
    await api.put(`/master/${deptCode}/${activeTab}/${id}${q}`, patch);
    const data = await api.get(`/master/${deptCode}/${activeTab}${q}`);
    setRows(data);
  }
  async function handleDelete(id) {
    if (!confirm("Delete this record?")) return;
    await api.del(`/master/${deptCode}/${activeTab}/${id}${q}`);
    const data = await api.get(`/master/${deptCode}/${activeTab}${q}`);
    setRows(data);
  }
  async function handleCreate(newRow) {
    await api.post(`/master/${deptCode}/${activeTab}${q}`, newRow);
    const data = await api.get(`/master/${deptCode}/${activeTab}${q}`);
    setRows(data);
  }

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">{deptCode} — Master data ({selected?.name || selectedCode}) {canEdit ? "" : <span className="badge" style={{ marginLeft: 8 }}>View only</span>}</p>
        <div className="tabs">
          {MASTER_TABS.map((t) => (
            <div key={t.key} className={`tab${activeTab === t.key ? " active" : ""}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="error-text">{error}</div>}
        {!loading && !error && (
          <DataTable
            columns={tab.cols}
            rows={rows}
            canEdit={canEdit}
            onSave={handleSave}
            onDelete={handleDelete}
            onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  );
}
