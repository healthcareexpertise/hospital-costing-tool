import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useProcedure } from "../../context/ProcedureContext";

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
    const { hospital_defaults, department_driver_type, procedure_default_hours, procedure_default_days, ...payload } = data;
    await api.put(`/input/${deptCode}${q}`, payload);
    setSaved(true);
    const refreshed = await api.get(`/input/${deptCode}${q}`);
    setData(refreshed);
    setTimeout(() => setSaved(false), 2000);
  }

  if (error) return <div className="content"><div className="card error-text">{error}</div></div>;
  if (!data) return <div className="content">Loading...</div>;

  const driverKey = data.department_driver_type === "HOURS" ? "driver_hours" : "driver_days";
  const driverLabel = data.department_driver_type === "HOURS" ? "Surgery / procedure duration (hours)" : "Length of stay (days)";
  const procedureDefaultValue = data.department_driver_type === "HOURS" ? data.procedure_default_hours : data.procedure_default_days;
  const driverIsOverridden = data[driverKey] != null;
  const driverEffectiveValue = data[driverKey] ?? procedureDefaultValue;

  return (
    <div className="content">
      <div className="card" style={{ maxWidth: 640 }}>
        <p className="card-title">{deptCode} — Input parameters ({selected?.name || selectedCode}) {canEdit ? "" : <span className="badge" style={{ marginLeft: 8 }}>View only</span>}</p>

        <div className="field">
          <label>{driverLabel}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              value={driverEffectiveValue ?? ""}
              disabled={!canEdit}
              placeholder={`Procedure default: ${procedureDefaultValue ?? "not set"}`}
              onChange={(e) => setData({ ...data, [driverKey]: e.target.value === "" ? null : Number(e.target.value) })}
            />
            <span className={`pill ${driverIsOverridden ? "edit" : "view"}`}>
              {driverIsOverridden ? "Overridden here" : "Inherited from Procedure Master"}
            </span>
            {driverIsOverridden && canEdit && (
              <button className="secondary" onClick={() => setData({ ...data, [driverKey]: null })}>Reset to procedure default</button>
            )}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Set once for this procedure on <Link to="/admin/procedures">Procedure Master</Link> — override here only if
            this department genuinely needs a different duration/stay for this specific procedure.
          </span>
        </div>

        <div className="field">
          <label>Standard hours per day</label>
          <input
            type="number"
            value={data.standard_hours_day ?? ""}
            disabled={!canEdit}
            onChange={(e) => setData({ ...data, standard_hours_day: e.target.value === "" ? null : Number(e.target.value) })}
          />
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Denominator for per-hour conversion — genuinely varies by department type (e.g. OT vs ICU), so it's set
            per department rather than shared.
          </span>
        </div>

        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 16 }}>
          Standard working days/year, standard days/month, and bed count are hospital-wide constants — set them once
          on <Link to="/admin/rates">Rate &amp; Tariff Master</Link>, not here.
        </p>

        {canEdit && (
          <button className="primary" onClick={save} style={{ marginTop: 8 }}>Save</button>
        )}
        {saved && <span style={{ marginLeft: 10, color: "var(--primary)", fontSize: 13 }}>Saved ✓</span>}
      </div>
    </div>
  );
}
