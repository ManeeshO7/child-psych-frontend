"use client";

import { useState } from "react";

const PRACTICE_TZ = "America/Los_Angeles";

type ScheduleFollowupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  allowedTypes?: string[]; // ["followup_med_30", "followup_med_therapy_45"]
  onSuccess?: () => void;
};

export default function ScheduleFollowupModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  allowedTypes = ["followup_med_30", "followup_med_therapy_45"],
  onSuccess,
}: ScheduleFollowupModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!date || !time) {
      setError("Please select date and time.");
      return;
    }
    const duration = effectiveType === "followup_med_therapy_45" ? 45 : 30;
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/schedule-for-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          scheduledAt,
          durationMinutes: duration,
          type,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to schedule");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Schedule follow-up</h2>
          <p className="mt-1 text-sm text-gray-600">
            Schedule a follow-up for {patientName || "patient"}. They will be asked to add their card and confirm.
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Time (PST)</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {allowedTypes.length > 1 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Follow-up type</label>
              <select
                value={effectiveType}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {allowedTypes.includes("followup_med_30") && (
                  <option value="followup_med_30">30 min – Med management</option>
                )}
                {allowedTypes.includes("followup_med_therapy_45") && (
                  <option value="followup_med_therapy_45">45 min – Med + therapy</option>
                )}
              </select>
            </div>
          ) : (
            <input type="hidden" value={effectiveType} readOnly />
          )}
        </div>
        {error && <div className="px-6 pb-2 text-sm text-red-600">{error}</div>}
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
            disabled={submitting || !date || !time}
            className="rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
          >
            {submitting ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
