import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useProcedure } from "../../context/ProcedureContext";

const FIELDS = [
  { key: "driver_hours", label: "Surgery / procedure duration (hours)", hint: "Used for departments allocated by hours (e.g. OT, Lab, AC/Building hourly depts)" },
  { key: "driver_days", label: "Length of stay (days)", hint: "Used for departments allocated by length of stay (e.g. Ward, ICU, per-bed depts)" },
  { key: "standard_working_days_year", label: "Standard working days per year", hint: "Denominator for equipment/AC/furniture depreciation (default 300)" },
  { key: "standard_days_month", label: "Standard days per month", hint: "Denominator for manpower & building cost (default 22)" },
  { key: "standard_hours_day", label: "Standard hours per day", hint: "Denominator for per-hour conversion" },
  { key: "no_of_beds", label: "No. of beds", hint: "Used for per-bed apportionment in simple-asset departments" },
];

export default function InputPage() {
  const { deptCode } = useParams();
  const { can } = useAuth();
  const { selectedCode, selected } = useProcedure();
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const canEdit = can(`${deptCode}_INPUT`, "edit");
  const q = `?procedure=${encodeURIComponent(selectedCode)}`;

  useEffect(() => {
    setData(null);
    api.get(`/input/${deptCode}${q}`).then((d) => setData(d || {})).catch((e) => setError(e.message));
  }, [deptCode, selectedCode]);

  async function save() {
    setSaved(false);
    await api.put(`/input/${deptCode}${q}`, data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (error) return <div className="content"><div className="card error-text">{error}</div></div>;
  if (!data) return <div className="content">Loading...</div>;

  return (
    <div className="content">
      <div className="card" style={{ maxWidth: 560 }}>
        <p className="card-title">{deptCode} — Input parameters ({selected?.name || selectedCode}) {canEdit ? "" : <span className="badge" style={{ marginLeft: 8 }}>View only</span>}</p>
        {FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input
              type="number"
              value={data[f.key] ?? ""}
              disabled={!canEdit}
              onChange={(e) => setData({ ...data, [f.key]: e.target.value === "" ? null : Number(e.target.value) })}
            />
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{f.hint}</span>
          </div>
        ))}
        {canEdit && (
          <button className="primary" onClick={save}>Save</button>
        )}
        {saved && <span style={{ marginLeft: 10, color: "var(--primary)", fontSize: 13 }}>Saved ✓</span>}
      </div>
    </div>
  );
}
