import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useProcedure } from "../../context/ProcedureContext";

const HEADS = [
  { key: "manpower", label: "Manpower" },
  { key: "material", label: "Material" },
  { key: "machinery", label: "Machinery" },
  { key: "expenses", label: "Expenses" },
  { key: "utilities", label: "Utilities" },
];

export default function OutputPage() {
  const { deptCode } = useParams();
  const { selectedCode, selected } = useProcedure();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    api.get(`/output/${deptCode}?procedure=${encodeURIComponent(selectedCode)}`).then(setData).catch((e) => setError(e.message));
  }, [deptCode, selectedCode]);

  if (error) return <div className="content"><div className="card error-text">{error}</div></div>;
  if (!data) return <div className="content">Loading...</div>;

  const { cost_heads, breakdown, engine_type, source, note } = data;

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">{deptCode} — Cost per case ({selected?.name || selectedCode})</p>
        {source === "reference" && <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: -6 }}>{note}</p>}
        <div className="grid grid-5">
          {HEADS.map((h) => (
            <div className="metric" key={h.key}>
              <p className="metric-label">{h.label}</p>
              <p className="metric-value">₹{cost_heads[h.key].toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <span className="metric" style={{ display: "inline-block" }}>
            <span className="metric-label">Total cost per case</span>
            <span className="metric-value" style={{ fontSize: 24 }}>₹{cost_heads.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </span>
        </div>
      </div>

      {engine_type === "SIMPLE" ? (
        <div className="card">
          <p className="card-title">Parameters</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Value</th><th>Notes</th></tr></thead>
              <tbody>
                {breakdown.parameters.map((p, i) => (
                  <tr key={i}><td>{p.item}</td><td>{p.value}</td><td>{p.notes}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <DetailCard title="Manpower detail" rows={breakdown.manpower_detail} cols={[["role","Role"],["rate_type","Rate Type"],["rate_value","Rate"],["cost_for_case","Cost for Case"]]} />
          <DetailCard title="Material detail" rows={breakdown.material_detail} cols={[["item","Item"],["cost_price","Cost/Unit"],["qty","Qty"],["line_value","Line Value"]]} />
          <DetailCard title="Equipment (Machinery) detail" rows={breakdown.equipment_detail} cols={[["equipment","Equipment"],["cost_price","Cost Price"],["cost_for_case","Cost for Case"]]} />
          <DetailCard title="Non-medical asset (Expenses) detail" rows={breakdown.nonmedical_detail} cols={[["asset","Asset"],["cost_price","Cost Price"],["cost_for_case","Cost for Case"]]} />
          <DetailCard title="AC (Utilities) detail" rows={breakdown.ac_detail} cols={[["room","Room"],["capital_cost","Capital Cost"],["cost_for_case","Cost for Case"]]} />
          <DetailCard title="Power consumption (Utilities) detail" rows={breakdown.power_detail} cols={[["equipment","Equipment"],["power_kw","kW"],["cost_for_case","Cost for Case"]]} />
        </>
      )}
    </div>
  );
}

function DetailCard({ title, rows, cols }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="card">
      <p className="card-title">{title}</p>
      <div className="table-wrap">
        <table>
          <thead><tr>{cols.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map(([k]) => (
                  <td key={k}>{typeof r[k] === "number" ? r[k].toLocaleString(undefined, { maximumFractionDigits: 2 }) : r[k]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
