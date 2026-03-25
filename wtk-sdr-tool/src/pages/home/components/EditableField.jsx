import { useState } from "react";

export function EditableField({ value, placeholder, onSave, type, options }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  function startEdit() {
    setDraft(value || "");
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
  }
  function save() {
    const trimmed = draft.trim();
    if (trimmed !== (value || "")) onSave(trimmed);
    setEditing(false);
  }
  function handleKey(e) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  if (editing) {
    if (options) {
      return (
        <select
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onBlur={save}
          autoFocus
          style={{
            fontSize: 13,
            border: "1px solid var(--accent)",
            borderRadius: 4,
            padding: "2px 6px",
            fontFamily: "'Inter',sans-serif",
            background: "white",
            outline: "none",
            minWidth: 100,
          }}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKey}
        autoFocus
        type={type === "number" ? "number" : "text"}
        placeholder={placeholder || ""}
        style={{
          fontSize: 13,
          border: "1px solid var(--accent)",
          borderRadius: 4,
          padding: "2px 6px",
          fontFamily: "'Inter',sans-serif",
          width: "100%",
          background: "white",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    );
  }

  let display = value;
  if (display && (display.includes("[email") || display.includes("email protected"))) {
    display = null;
  }

  return (
    <span
      onClick={startEdit}
      style={{ cursor: "pointer", borderBottom: "1px dashed var(--border2)", paddingBottom: 1 }}
      title="Click to edit"
    >
      {display || (
        <span style={{ color: "var(--text3)", fontStyle: "italic" }}>{placeholder || "Click to add"}</span>
      )}
    </span>
  );
}
