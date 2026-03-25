import { REJECTION_REASONS } from "../../../data/pipelineConstants.js";

export function RejectLostModal({
  open,
  onClose,
  rejectReason,
  setRejectReason,
  rejectOtherText,
  setRejectOtherText,
  onConfirm,
}) {
  if (!open) return null;
  const disabled =
    !rejectReason || (rejectReason === "Other" && (!rejectOtherText || rejectOtherText.trim().length < 3));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Mark as Lost</div>
        <div className="modal-sub">Select lost reason (required)</div>
        <div className="reason-grid">
          {REJECTION_REASONS.map((r) => (
            <button key={r} className={`reason-btn ${rejectReason === r ? "selected" : ""}`} onClick={() => setRejectReason(r)}>
              {r}
            </button>
          ))}
        </div>
        {rejectReason === "Other" && (
          <div style={{ marginBottom: 12 }}>
            <input
              className="cmd-input"
              style={{ width: "100%" }}
              placeholder="Please specify reason (required)..."
              value={rejectOtherText || ""}
              onChange={(e) => setRejectOtherText(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-confirm danger-btn"
            disabled={disabled}
            style={{ opacity: disabled ? 0.5 : 1 }}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
