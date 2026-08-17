import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api } from "../api/client";

const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#8464c8"];

export default function GlobalDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("ALL");

  useEffect(() => {
    api.get("/dashboard/global").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="content"><div className="card">{error}</div></div>;
  if (!data) return <div className="content">Loading...</div>;

  const { rows, bySpecialty } = data;
  const specialties = ["ALL", ...bySpecialty.map((s) => s.specialty)];
  const filteredRows = specialtyFilter === "ALL" ? rows : rows.filter((r) => r.specialty === specialtyFilter);
  const sortedByTotal = [...filteredRows].sort((a, b) => b.total - a.total).slice(0, 15);

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Hospital-wide procedure costing — {rows.length} procedures across {bySpecialty.length} specialties</p>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${bySpecialty.length}, 1fr)` }}>
          {bySpecialty.map((s) => (
            <div className="metric" key={s.specialty}>
              <p className="metric-label">{s.specialty} ({s.procedure_count} procedures)</p>
              <p className="metric-value">₹{s.total_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-4" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
        <div className="card">
          <p className="card-title">Package cost share by specialty</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={bySpecialty} dataKey="total_cost" nameKey="specialty" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {bySpecialty.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `₹${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="card-title">Top procedures by package cost</p>
            <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)} style={{ marginBottom: 12 }}>
              {specialties.map((s) => <option key={s} value={s}>{s === "ALL" ? "All specialties" : s}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sortedByTotal} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="procedure" width={150} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <Bar dataKey="total" fill="#2a78d6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <p className="card-title">All procedures</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Specialty</th><th>Procedure</th><th>Manpower</th><th>Material</th><th>Machinery</th><th>Expenses</th><th>Utilities</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.procedure_code}>
                  <td>{r.specialty}</td>
                  <td>{r.procedure}</td>
                  <td>₹{r.manpower.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td>₹{r.material.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td>₹{r.machinery.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td>₹{r.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td>₹{r.utilities.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ fontWeight: 600 }}>₹{r.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
          CABG's total is inflated by an equipment-apportionment limitation for a few hospital-wide service departments — see README. All Cardiology/Neurosurgery/Urology figures are sourced directly from the hospital's own procedure cost sheets.
        </p>
      </div>
    </div>
  );
}
