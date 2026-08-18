import React, { useState } from "react";

/**
 * Generic editable table.
 * columns: [{ key, label, type: 'text'|'number'|'select', editable, options: [{value,label}],
 *             computed: (row) => value, onSelect: (value, row) => partialPatch }]
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
      if (c.computed || c.editable === false) return;
      blank[c.key] = c.type === "number" ? 0 : c.type === "select" ? (c.options?.[0]?.value ?? "") : "";
    });
    setNewRow(blank);
  }
  async function saveCreate() {
    await onCreate(newRow);
    setNewRow(null);
  }

  // row = current draft/newRow object, col = column def, mergeFn = (patch) => void to merge fields into that state
  function renderInput(row, col, mergeFn) {
    const value = row[col.key];
    if (col.type === "select") {
      return (
        <select
          value={value ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            let patch = { [col.key]: v };
            if (col.onSelect) patch = { ...patch, ...col.onSelect(v, row) };
            mergeFn(patch);
          }}
          style={{ width: "100%" }}
        >
          {col.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input
        type={col.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={(e) => mergeFn({ [col.key]: col.type === "number" ? Number(e.target.value) : e.target.value })}
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
                    ) : c.editable === false ? (
                      <span style={{ color: "var(--text-muted)" }}>(auto)</span>
                    ) : (
                      renderInput(newRow, c, (patch) => setNewRow({ ...newRow, ...patch }))
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
                      renderInput(draft, c, (patch) => setDraft({ ...draft, ...patch }))
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
