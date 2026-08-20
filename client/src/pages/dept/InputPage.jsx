import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useProcedure } from "../../context/ProcedureContext";

const DRIVER_FIELDS = [
  { key: "driver_hours", label: "Surgery / procedure duration (hours)", hint: "Used for departments allocated by hours (e.g. OT, Lab, AC/Building hourly depts)" },
  { key: "driver_days", label: "Length of stay (days)", hint: "Used for departments allocated by length of stay (e.g. Ward, ICU, per-bed depts)" },
  { key: "standard_hours_day", label: "Standard hours per day", hint: "Denominator for per-hour conversion — genuinely varies by department type, so this isn't inherited" },
];

// These 3 are common across every specialty/procedure at this hospital, so they're
// inherited from Rate & Tariff Master (the "common input module") unless overridden here.
const COMMON_FIELDS = [
  { key: "standard_working_days_year", label: "Standard working days per year", hint: "Denominator for equipment/AC/furniture depreciation" },
  { key: "standard_days_month", label: "Standard days per month", hint: "Denominator for manpower & building cost" },
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
    const { hospital_defaults, ...payload } = data;
    await api.put(`/input/${deptCode}${q}`, payload);
    setSaved(true);
    const refreshed = await api.get(`/input/${deptCode}${q}`);
    setData(refreshed);
    setTimeout(() => setSaved(false), 2000);
  }

  if (error) return <div className="content"><div className="card error-text">{error}</div></div>;
  if (!data) return <div className="content">Loading...</div>;

  const defaults = data.hospital_defaults || {};

  function renderField(f, isCommon) {
    const isOverridden = isCommon && data[f.key] != null;
    const effectiveValue = isCommon ? (data[f.key] ?? defaults[f.key]) : data[f.key];
    return (
      <div className="field" key={f.key}>
        <label>{f.label}</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            value={effectiveValue ?? ""}
            disabled={!canEdit}
            placeholder={isCommon ? `Hospital default: ${defaults[f.key]}` : ""}
            onChange={(e) => setData({ ...data, [f.key]: e.target.value === "" ? null : Number(e.target.value) })}
          />
          {isCommon && (
            <span className={`pill ${isOverridden ? "edit" : "view"}`}>
              {isOverridden ? "Overridden here" : "Inherited from Rate & Tariff Master"}
            </span>
          )}
          {isCommon && isOverridden && canEdit && (
            <button className="secondary" onClick={() => setData({ ...data, [f.key]: null })}>Reset to default</button>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{f.hint}</span>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="card" style={{ maxWidth: 620 }}>
        <p className="card-title">{deptCode} — Input parameters ({selected?.name || selectedCode}) {canEdit ? "" : <span className="badge" style={{ marginLeft: 8 }}>View only</span>}</p>
        {DRIVER_FIELDS.map((f) => renderField(f, false))}
        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Common inputs (shared across every specialty at this hospital)</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, marginBottom: 12 }}>
          These come from <strong>Rate &amp; Tariff Master</strong> by default. Only set a value here if this specific
          department genuinely needs a different figure than the rest of the hospital.
        </p>
        {COMMON_FIELDS.map((f) => renderField(f, true))}
        {canEdit && (
          <button className="primary" onClick={save} style={{ marginTop: 8 }}>Save</button>
        )}
        {saved && <span style={{ marginLeft: 10, color: "var(--primary)", fontSize: 13 }}>Saved ✓</span>}
      </div>
    </div>
  );
}
