import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api } from "../../api/client";

const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

export default function TestDashboardPage() {
  const { deptCode } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api.get(`/test-master/${deptCode}/dashboard`).then(setData).catch((e) => setError(e.message));
  }, [deptCode]);

  if (error) return <div className="content"><div className="card error-text">{error}</div></div>;
  if (!data) return <div className="content">Loading...</div>;

  const topTests = [...data.tests].sort((a, b) => b.total_actual - a.total_actual).slice(0, 10);
  const ov = data.overhead || {};
  const overheadPie = [
    { name: "Manpower", value: ov.manpower_actual || 0 },
    { name: "Equipment", value: ov.equipment_actual || 0 },
    { name: "Building", value: ov.building_actual || 0 },
    { name: "Power", value: ov.power_actual || 0 },
    { name: "Common Consumables", value: ov.common_consumables_actual || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">{deptCode} — Dashboard</p>
        <div className="grid grid-4">
          <div className="metric"><p className="metric-label">Total tests</p><p className="metric-value">{data.test_count}</p></div>
          <div className="metric"><p className="metric-label">Most expensive test</p><p className="metric-value" style={{ fontSize: 15 }}>{topTests[0]?.test_name || "—"}</p></div>
          <div className="metric"><p className="metric-label">Highest cost (actual)</p><p className="metric-value">₹{(topTests[0]?.total_actual || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
          <div className="metric"><p className="metric-label">Overhead share (actual)</p><p className="metric-value">₹{(data.tests[0]?.overhead_actual || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
        </div>
      </div>

      <div className="grid grid-4" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
        {overheadPie.length > 0 && (
          <div className="card">
            <p className="card-title">Overhead composition (per test, actual)</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={overheadPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {overheadPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card">
          <p className="card-title">Top 10 most expensive tests (actual)</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topTests} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `₹${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="test_name" width={160} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              <Bar dataKey="total_actual" fill="#2a78d6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
