import { useState, useCallback } from "react";

/**
 * Lost / reopen modal state + confirm handler (pipeline_stage + rejection_reason).
 */
export function useRejectLost(updatePipeline) {
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOtherText, setRejectOtherText] = useState("");

  const openRejectModal = useCallback((tid, stage, e) => {
    if (e) e.stopPropagation();
    setRejectReason("");
    setRejectOtherText("");
    setRejectModal({ tid, stage });
  }, []);

  const confirmReject = useCallback(async () => {
    if (!rejectModal) return;
    const stageVal = rejectModal.stage === "dead" ? "lost" : rejectModal.stage;
    const reason =
      rejectReason === "Other" && rejectOtherText
        ? "Other: " + rejectOtherText.trim()
        : rejectReason || "Not specified";
    const updates = { pipeline_stage: stageVal, rejection_reason: reason };
    await updatePipeline(rejectModal.tid, updates);
    setRejectModal(null);
    setRejectOtherText("");
  }, [rejectModal, rejectReason, rejectOtherText, updatePipeline]);

  const closeRejectModal = useCallback(() => {
    setRejectModal(null);
    setRejectOtherText("");
  }, []);

  return {
    rejectModal,
    rejectReason,
    setRejectReason,
    rejectOtherText,
    setRejectOtherText,
    openRejectModal,
    confirmReject,
    closeRejectModal,
  };
}
