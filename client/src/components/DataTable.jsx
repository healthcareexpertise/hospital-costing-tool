import React, { useState } from "react";

/**
 * Generic editable table.
 * columns: [{ key, label, type: 'text'|'number', editable }]
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
    columns.forEach((c) => (blank[c.key] = c.type === "number" ? 0 : ""));
    setNewRow(blank);
  }
  async function saveCreate() {
    await onCreate(newRow);
    setNewRow(null);
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
                    <input
                      type={c.type === "number" ? "number" : "text"}
                      value={newRow[c.key]}
                      onChange={(e) => setNewRow({ ...newRow, [c.key]: c.type === "number" ? Number(e.target.value) : e.target.value })}
                      style={{ width: "100%" }}
                    />
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
                    {editingId === row.id && c.editable !== false ? (
                      <input
                        type={c.type === "number" ? "number" : "text"}
                        value={draft[c.key] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [c.key]: c.type === "number" ? Number(e.target.value) : e.target.value })}
                        style={{ width: "100%" }}
                      />
                    ) : c.type === "number" && typeof row[c.key] === "number" ? (
                      row[c.key].toLocaleString(undefined, { maximumFractionDigits: 2 })
                    ) : (
                      row[c.key] ?? ""
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
