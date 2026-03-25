/** 删除酒店二次确认 */
export function DeleteHotelConfirm({ deleteId, hotelName, onCancel, onConfirmDelete }) {
  if (!deleteId) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-title">Delete this hotel?</div>
        <div className="confirm-sub">
          {hotelName ? (
            <>
              <strong>&quot;{hotelName}&quot;</strong> and all its outreach history will be permanently deleted from the shared
              database. This cannot be undone.
            </>
          ) : (
            "This hotel and all its outreach history will be permanently deleted. This cannot be undone."
          )}
        </div>
        <div className="confirm-btns">
          <button className="confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-del" onClick={() => onConfirmDelete(deleteId)}>
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}
