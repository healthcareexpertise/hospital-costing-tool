import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";

export default function TestOutputPage() {
  const { deptCode } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("sl_no");
  const [sortDir, setSortDir] = useState(1);

  useEffect(() => {
    setData(null);
    api.get(`/test-master/${deptCode}/output`).then(setData).catch((e) => setError(e.message));
  }, [deptCode]);

  const filteredSorted = useMemo(() => {
    if (!data) return [];
    let rows = data.tests;
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((t) => t.test_name.toLowerCase().includes(s));
    }
    return [...rows].sort((a, b) => (a[sortKey] > b[sortKey] ? sortDir : a[sortKey] < b[sortKey] ? -sortDir : 0));
  }, [data, search, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(-sortDir);
    else { setSortKey(key); setSortDir(1); }
  }

  if (error) return <div className="content"><div className="card error-text">{error}</div></div>;
  if (!data) return <div className="content">Loading...</div>;

  const avgActual = data.tests.length ? data.tests.reduce((s, t) => s + t.total_actual, 0) / data.tests.length : 0;

  return (
    <div className="content">
      <div className="card">
        <p className="card-title">{deptCode} — Test Price List ({data.test_count} tests)</p>
        <div className="grid grid-4">
          <div className="metric"><p className="metric-label">Total tests</p><p className="metric-value">{data.test_count}</p></div>
          <div className="metric"><p className="metric-label">Avg. cost (actual)</p><p className="metric-value">₹{avgActual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
          <div className="metric"><p className="metric-label">Overhead / test (actual)</p><p className="metric-value">₹{(data.tests[0]?.overhead_actual || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
          <div className="metric"><p className="metric-label">Overhead / test (standard)</p><p className="metric-value">₹{(data.tests[0]?.overhead_standard || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
        </div>
      </div>

      <div className="card">
        <input
          placeholder="Search test name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => toggleSort("sl_no")} style={{ cursor: "pointer" }}>Sl No</th>
                <th onClick={() => toggleSort("test_name")} style={{ cursor: "pointer" }}>Test Name</th>
                <th onClick={() => toggleSort("direct_cost")} style={{ cursor: "pointer" }}>Direct Cost</th>
                <th onClick={() => toggleSort("doctor_fee")} style={{ cursor: "pointer" }}>Doctor Fee</th>
                <th onClick={() => toggleSort("overhead_actual")} style={{ cursor: "pointer" }}>Overhead (Actual)</th>
                <th onClick={() => toggleSort("total_actual")} style={{ cursor: "pointer" }}>Total (Actual)</th>
                <th onClick={() => toggleSort("total_standard")} style={{ cursor: "pointer" }}>Total (Standard)</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((t) => (
                <tr key={t.id}>
                  <td>{t.sl_no}</td><td>{t.test_name}</td>
                  <td>₹{t.direct_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>₹{t.doctor_fee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>₹{t.overhead_actual.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td style={{ fontWeight: 600 }}>₹{t.total_actual.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>₹{t.total_standard.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {filteredSorted.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>No tests match "{search}"</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
