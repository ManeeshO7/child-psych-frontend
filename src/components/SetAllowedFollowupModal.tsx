"use client";

import { useState } from "react";

type SetAllowedFollowupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  onSuccess?: () => void;
};

export default function SetAllowedFollowupModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onSuccess,
}: SetAllowedFollowupModalProps) {
  const [allow30, setAllow30] = useState(false);
  const [allow45, setAllow45] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!allow30 && !allow45) {
      setError("Select at least one follow-up type.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const allowedTypes: string[] = [];
      if (allow30) allowedTypes.push("followup_med_30");
      if (allow45) allowedTypes.push("followup_med_therapy_45");
      const res = await fetch(`/api/appointments/patient/${patientId}/allowed-followup-types`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ allowedTypes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Set patient&apos;s follow-up type</h2>
          <p className="mt-1 text-sm text-gray-600">
            Which follow-up appointments can {patientName || "this patient"} book? (Decided during clinical intake.)
          </p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={allow30}
              onChange={(e) => setAllow30(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-warm-brown focus:ring-warm-brown"
            />
            <span className="font-medium">30 min – Follow-up (med management)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={allow45}
              onChange={(e) => setAllow45(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-warm-brown focus:ring-warm-brown"
            />
            <span className="font-medium">45 min – Follow-up (med + therapy)</span>
          </label>
        </div>
        {error && (
          <div className="px-6 pb-2 text-sm text-red-600">{error}</div>
        )}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (!allow30 && !allow45)}
            className="rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
