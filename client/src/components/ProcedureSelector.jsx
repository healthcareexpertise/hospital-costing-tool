import React from "react";
import { useProcedure } from "../context/ProcedureContext";

export default function ProcedureSelector() {
  const { bySpecialty, selectedCode, selectProcedure } = useProcedure();
  const specialtyKeys = Object.keys(bySpecialty);
  if (specialtyKeys.length === 0) return null;

  return (
    <select
      value={selectedCode}
      onChange={(e) => selectProcedure(e.target.value)}
      style={{ fontWeight: 600, minWidth: 220 }}
      title="Selected procedure — applies to Master, Input, Output and Dashboard screens"
    >
      {specialtyKeys.map((sk) => (
        <optgroup key={sk} label={bySpecialty[sk].specialty_name}>
          {bySpecialty[sk].items.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
