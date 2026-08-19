import React from "react";
import { useParams } from "react-router-dom";

export default function TestInputPage() {
  const { deptCode } = useParams();
  return (
    <div className="content">
      <div className="card">
        <p className="card-title">{deptCode} — Input</p>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
          Lab and Radiology departments are costed per test rather than per procedure, so there's no
          separate volume/driver input here. The "actual" vs "standard" test-volume figures that drive
          overhead apportionment are set on the <strong>Master</strong> screen, under "Shared department overhead".
        </p>
      </div>
    </div>
  );
}
