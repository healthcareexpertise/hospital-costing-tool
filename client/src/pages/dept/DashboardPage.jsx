import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { api } from "../../api/client";
import { useProcedure } from "../../context/ProcedureContext";

const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const HEADS = [
  { key: "manpower", label: "Manpower" },
  { key: "material", label: "Material" },
  { key: "machinery", label: "Machinery" },
  { key: "expenses", label: "Expenses" },
  { key: "utilities", label: "Utilities" },
];

export default function DashboardPage() {
  const { deptCode } = useParams();
  const { selectedCode, selected } = useProcedure();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api.get(`/output/${deptCode}/dashboard?procedure=${encodeURIComponent(selectedCode)}`).then(setData).catch((e) => setError(e.message));
  }, [deptCode, selectedCode]);

  if (error) return <div className="content"><div className="card error-text">{error}</div></div>;
  if (!data) return <div className="content">Loading...</div>;

  const pieData = HEADS.map((h) => ({ name: h.label, value: data.cost_heads[h.key] })).filter((d) => d.value > 0);

  const topEquip = (data.breakdown.equipment_detail || [])
    .slice().sort((a, b) => b.cost_for_case - a.cost_for_case).slice(0, 8);
  const topMaterial = (data.breakdown.material_detail || [])
    .slice().sort((a, b) => b.line_value - a.line_value).slice(0, 8);

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">{deptCode} — Dashboard ({selected?.name || selectedCode})</p>
        <div className="grid grid-5">
          {HEADS.map((h) => (
            <div className="metric" key={h.key}>
              <p className="metric-label">{h.label}</p>
              <p className="metric-value">₹{data.cost_heads[h.key].toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-4" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
        <div className="card">
          <p className="card-title">Cost head split</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `₹${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {topEquip.length > 0 && (
          <div className="card">
            <p className="card-title">Top equipment by cost for case</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topEquip} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `₹${v.toFixed(0)}`} />
                <YAxis type="category" dataKey="equipment" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                <Bar dataKey="cost_for_case" fill="#1baf7a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {topEquip.length === 0 && topMaterial.length > 0 && (
          <div className="card">
            <p className="card-title">Top materials by line value</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topMaterial} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `₹${v.toFixed(0)}`} />
                <YAxis type="category" dataKey="item" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
                <Bar dataKey="line_value" fill="#eb6834" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
