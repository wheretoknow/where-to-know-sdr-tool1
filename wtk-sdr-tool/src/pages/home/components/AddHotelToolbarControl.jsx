import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { sbFetch } from "../../../api/supabase.js";
import { uid } from "../../../utils/uid.js";
import { AddHotelModal } from "./AddHotelModal.jsx";

function formHasData(form) {
  return Object.values(form).some((v) => v !== null && v !== undefined && String(v).trim() !== "");
}

export const AddHotelToolbarControl = forwardRef(function AddHotelToolbarControl(
  { sdrName, setProspects, setTracking, onToast, onOpenChange },
  ref
) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  function closeModal() {
    if (formHasData(form)) {
      if (!window.confirm("You have unsaved changes. Close anyway?")) return;
    }
    setOpen(false);
    setForm({});
  }

  useImperativeHandle(ref, () => ({
    requestClose: closeModal,
  }));

  async function saveManualHotel() {
    const f = form;
    if (!f.hotel_name || !f.hotel_name.trim()) {
      alert("Hotel name is required");
      return;
    }
    const record = {
      id: uid(),
      hotel_name: f.hotel_name.trim(),
      city: f.city?.trim() || null,
      country: f.country?.trim() || null,
      hotel_group: f.hotel_group?.trim() || null,
      brand: f.brand?.trim() || null,
      address: f.address?.trim() || null,
      website: f.website?.trim() || null,
      adr_usd: f.adr_usd ? Number(f.adr_usd) : null,
      rooms: f.rooms ? Number(f.rooms) : null,
      current_provider: f.current_provider || null,
      gm_name: f.gm_name?.trim() || null,
      gm_first_name: f.gm_name?.trim() ? f.gm_name.trim().split(" ")[0] : null,
      gm_title: f.gm_title?.trim() || null,
      email: f.email?.trim() || null,
      linkedin: f.linkedin?.trim() || null,
      management_company: f.management_company?.trim() || null,
      operating_model: f.operating_model || null,
      research_notes: f.notes?.trim() || "Manually added",
      sdr: sdrName || "Unknown",
      batch: "manual-" + new Date().toISOString().slice(0, 10),
    };
    try {
      const resp = await sbFetch("/prospects", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify(record),
      });
      const row = Array.isArray(resp) ? resp[0] : resp;
      if (row) {
        setProspects((prev) => [...prev, row]);
        const tRow = {
          id: uid(),
          prospect_id: row.id,
          hotel: row.hotel_name,
          gm: row.gm_name || null,
          sdr: sdrName || "Unknown",
          pipeline_stage: "new",
          done: [],
          intention: 0,
        };
        try {
          const tData = await sbFetch("/tracking", {
            method: "POST",
            prefer: "return=representation",
            body: JSON.stringify(tRow),
          });
          const tr = Array.isArray(tData) ? tData[0] : tData;
          if (tr) setTracking((prev) => [...prev, tr]);
        } catch (e) {
          console.error("Add hotel tracking insert:", e);
        }
      }
      setOpen(false);
      setForm({});
      onToast?.(`✓ "${record.hotel_name}" added to hotel list`);
    } catch (err) {
      console.error("Save hotel error:", err);
      alert("Error: " + err.message);
    }
  }

  return (
    <>
      <button
        type="button"
        className="export-btn"
        style={{ fontWeight: 600 }}
        onClick={() => {
          setForm({});
          setOpen(true);
        }}
      >
        + Add Hotel
      </button>
      <AddHotelModal open={open} form={form} setForm={setForm} onClose={closeModal} onSave={saveManualHotel} />
    </>
  );
});
