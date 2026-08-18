import React, { useState } from "react";

/**
 * Generic editable table.
 * columns: [{ key, label, type: 'text'|'number'|'select', editable, options: [{value,label}], computed: (row) => value }]
 * rows: array of objects (must include id, unless singleRow)
 * onSave(rowId, patch) / onDelete(rowId) / onCreate(newRow) — omit to hide the action
 */
export default function DataTable({ columns, rows, canEdit, onSave, onDelete, onCreate }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newRow, setNewRow] = useState(null);

  function startEdit(row) {
    setEditingId(row.id);
    setDraft({ ...row });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }
  async function saveEdit() {
    await onSave(editingId, draft);
    setEditingId(null);
  }
  function startCreate() {
    const blank = {};
    columns.forEach((c) => {
      if (c.computed) return;
      blank[c.key] = c.type === "number" ? 0 : c.type === "select" ? (c.options?.[0]?.value ?? "") : "";
    });
    setNewRow(blank);
  }
  async function saveCreate() {
    await onCreate(newRow);
    setNewRow(null);
  }

  function renderInput(value, onChange, col) {
    if (col.type === "select") {
      return (
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={{ width: "100%" }}>
          {col.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input
        type={col.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(col.type === "number" ? Number(e.target.value) : e.target.value)}
        style={{ width: "100%" }}
      />
    );
  }

  function displayValue(row, col) {
    if (col.computed) return col.computed(row);
    if (col.type === "select" && col.options) {
      const match = col.options.find((o) => String(o.value) === String(row[col.key]));
      return match ? match.label : (row[col.key] ?? "");
    }
    if (col.type === "number" && typeof row[col.key] === "number") return row[col.key].toLocaleString(undefined, { maximumFractionDigits: 2 });
    return row[col.key] ?? "";
  }

  return (
    <div>
      {canEdit && onCreate && !newRow && (
        <button className="secondary" style={{ marginBottom: 10 }} onClick={startCreate}>
          + Add row
        </button>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {canEdit && (onSave || onDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {newRow && (
              <tr>
                {columns.map((c) => (
                  <td key={c.key}>
                    {c.computed ? (
                      <span style={{ color: "var(--text-muted)" }}>{c.computed(newRow)}</span>
                    ) : (
                      renderInput(newRow[c.key], (v) => setNewRow({ ...newRow, [c.key]: v }), c)
                    )}
                  </td>
                ))}
                <td>
                  <button className="primary" onClick={saveCreate} style={{ marginRight: 6 }}>Save</button>
                  <button className="secondary" onClick={() => setNewRow(null)}>Cancel</button>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key}>
                    {editingId === row.id && c.editable !== false && !c.computed ? (
                      renderInput(draft[c.key], (v) => setDraft({ ...draft, [c.key]: v }), c)
                    ) : (
                      displayValue(editingId === row.id ? draft : row, c)
                    )}
                  </td>
                ))}
                {canEdit && (onSave || onDelete) && (
                  <td style={{ whiteSpace: "nowrap" }}>
                    {editingId === row.id ? (
                      <>
                        <button className="primary" onClick={saveEdit} style={{ marginRight: 6 }}>Save</button>
                        <button className="secondary" onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        {onSave && <button className="secondary" onClick={() => startEdit(row)} style={{ marginRight: 6 }}>Edit</button>}
                        {onDelete && <button className="danger" onClick={() => onDelete(row.id)}>Delete</button>}
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && !newRow && (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
