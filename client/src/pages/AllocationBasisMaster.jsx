import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AllocationBasisMaster() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/dashboard/allocation-basis-master").then(setRows); }, []);

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">Allocation Basis Master ({rows.length} rules)</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -6 }}>
          The driver used to apportion each cost component to one CABG case, by department. Read-only reference.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Classification</th><th>Department</th><th>Cost Component</th><th>Basis of Allocation</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.classification}</td><td>{r.department_name}</td><td>{r.cost_component}</td><td>{r.basis_of_allocation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
