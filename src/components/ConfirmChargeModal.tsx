"use client";

import { useState, useEffect } from "react";

const PRACTICE_TZ = "America/Los_Angeles";

const TYPE_LABELS: Record<string, string> = {
  clinical_intake: "Clinical intake",
  orientation_consult: "Orientation consult",
  followup_med_30: "Follow-up (30 min)",
  followup_med_therapy_45: "Follow-up (45 min)",
};

type Pricing = {
  pricing: {
    [key: string]: {
      amountCents: number;
      amountDollars: number;
      formatted: string;
    };
  };
};

type ConfirmChargeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    type: string;
    scheduledAt: string;
    durationMinutes?: number;
    patient?: { name?: string };
  } | null;
  onSuccess: () => void;
};

export default function ConfirmChargeModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: ConfirmChargeModalProps) {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setPricing(null);
    setPricingLoading(true);
    fetch("/api/payments/pricing", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPricing(data))
      .catch(() => setPricing(null))
      .finally(() => setPricingLoading(false));
  }, [isOpen]);

  async function handleConfirm() {
    if (!appointment?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/charge`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Charge failed");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Charge failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const typeLabel = TYPE_LABELS[appointment?.type ?? ""] ?? appointment?.type?.replace(/_/g, " ") ?? "Visit";
  const visitPrice = appointment ? pricing?.pricing?.[appointment.type] : null;
  const formattedDate = appointment?.scheduledAt
    ? new Date(appointment.scheduledAt).toLocaleString("en-US", {
        timeZone: PRACTICE_TZ,
        dateStyle: "medium",
        timeStyle: "short",
        hour12: true,
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Confirm charge</h2>
          <p className="mt-1 text-sm text-gray-600">
            Review the amount below. The patient&apos;s card will be charged.
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="rounded-lg border border-cream-200 bg-gray-50 p-4 space-y-2">
            <div>
              <p className="text-xs text-gray-500">Patient</p>
              <p className="font-medium text-gray-900">{appointment?.patient?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Appointment</p>
              <p className="font-medium text-gray-900">
                {typeLabel}
                {appointment?.durationMinutes ? ` · ${appointment.durationMinutes} min` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date & time</p>
              <p className="font-medium text-gray-900">{formattedDate} PST</p>
            </div>
            <div className="pt-2 border-t border-cream-200">
              <p className="text-xs text-gray-500">Amount to charge (from Stripe)</p>
              {pricingLoading ? (
                <p className="font-medium text-gray-500">Loading…</p>
              ) : visitPrice ? (
                <p className="text-lg font-semibold text-warm-brown">{visitPrice.formatted}</p>
              ) : (
                <p className="font-medium text-amber-700">Pricing not available — will use configured amount</p>
              )}
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
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
            onClick={handleConfirm}
            disabled={submitting || pricingLoading}
            className="rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
          >
            {submitting ? "Charging…" : "Confirm charge"}
          </button>
        </div>
      </div>
    </div>
  );
}
