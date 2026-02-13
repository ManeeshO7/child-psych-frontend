"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const PRACTICE_TZ = "America/Los_Angeles";

type Appointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  type: string;
  status: string;
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

export default function ConfirmScheduledPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [hasCard, setHasCard] = useState(false);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [pendingForms, setPendingForms] = useState<{ hasPendingForms: boolean; pendingCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [apptRes, pmRes, pricingRes, formsRes] = await Promise.all([
          fetch(`/api/appointments/${appointmentId}`, { credentials: "include" }),
          fetch("/api/payments/payment-method", { credentials: "include" }),
          fetch("/api/payments/pricing", { credentials: "include" }),
          fetch("/api/patient-forms/check-pending", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (apptRes.ok) {
          const data = await apptRes.json();
          setAppointment(data);
        }
        if (pmRes.ok) {
          const pm = await pmRes.json();
          setHasCard(Boolean(pm?.hasCard ?? pm?.last4));
        }
        if (pricingRes.ok) {
          const data = await pricingRes.json();
          setPricing(data);
        }
        if (formsRes.ok) {
          const data = await formsRes.json();
          setPendingForms(data);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  async function handleConfirm() {
    if (!appointmentId) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/confirm-by-patient`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to confirm");
      }
      router.push("/patient");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setConfirming(false);
    }
  }

  if (!appointmentId) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-600">No appointment specified.</p>
        <Link href="/patient" className="mt-4 inline-block text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  if (loading || !appointment) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  if (appointment.status !== "pending_confirmation") {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-600">
          This appointment has already been confirmed or is no longer pending.
        </p>
        <Link href="/patient" className="mt-4 inline-block text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  const formattedDate = new Date(appointment.scheduledAt).toLocaleDateString("en-US", {
    timeZone: PRACTICE_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = new Date(appointment.scheduledAt).toLocaleTimeString("en-US", {
    timeZone: PRACTICE_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const typeLabels: Record<string, string> = {
    clinical_intake: "Clinical intake",
    orientation_consult: "Orientation consult",
    followup_med_30: "Follow-up (30 min)",
    followup_med_therapy_45: "Follow-up (45 min)",
  };
  const typeLabel = typeLabels[appointment.type] ?? appointment.type.replace(/_/g, " ");
  const visitPrice = pricing?.pricing?.[appointment.type];
  const isClinicalIntake = appointment.type === "clinical_intake";
  const mustCompleteForms = isClinicalIntake && pendingForms?.hasPendingForms;

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/patient" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>
      <h1 className="section-heading">Confirm your scheduled appointment</h1>
      <p className="mt-2 text-gray-600">
        Your doctor has scheduled this appointment for you. Add your card (if needed) and confirm to secure it.
      </p>

      <div className="mt-6 rounded-lg border border-cream-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-warm-brown mb-4">Appointment details</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Date & Time</p>
            <p className="text-base font-medium text-gray-900">
              {formattedDate}, {formattedTime} PST
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-base font-medium text-gray-900">
              {appointment.durationMinutes} min · {typeLabel}
            </p>
          </div>
          {visitPrice && (
            <div className="mt-4 pt-4 border-t border-cream-200">
              <p className="text-sm text-gray-600">Visit Fee</p>
              <p className="text-lg font-semibold text-warm-brown">{visitPrice.formatted}</p>
              <p className="mt-1 text-xs text-gray-500">
                You will be charged {visitPrice.formatted} after you attend your appointment. Your card on file will be used for payment.
              </p>
            </div>
          )}
        </div>
      </div>

      {mustCompleteForms && (
        <div className="mt-6 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Complete your forms first</p>
          <p className="mt-1 text-sm text-amber-800">
            Your doctor has assigned {pendingForms?.pendingCount ?? 0} form{pendingForms?.pendingCount === 1 ? "" : "s"} for you to complete before confirming your clinical intake. Please complete them in Forms & Documents, then return here to confirm.
          </p>
          <Link
            href="/patient/forms"
            className="mt-3 inline-block rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
          >
            Complete forms →
          </Link>
        </div>
      )}
      {!mustCompleteForms && !hasCard ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Add your card first</p>
          <p className="mt-1 text-sm text-amber-800">
            Save your payment method before confirming. You will be charged after your visit.
            {visitPrice && (
              <span className="block mt-2 font-medium text-amber-900">
                Visit fee: {visitPrice.formatted}
              </span>
            )}
          </p>
          <Link
            href={`/patient/save-card?appointmentId=${encodeURIComponent(appointmentId)}&returnTo=${encodeURIComponent(`/patient/confirm-scheduled?appointmentId=${appointmentId}`)}`}
            className="mt-3 inline-block rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
          >
            Save card →
          </Link>
        </div>
      ) : !mustCompleteForms && hasCard ? (
        <>
          <p className="mt-6 text-sm text-gray-600">Card on file. Click below to confirm.</p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            className="mt-4 rounded-lg bg-warm-brown px-6 py-3 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
          >
            {confirming ? "Confirming…" : "Confirm appointment"}
          </button>
          <p className="mt-4 text-xs text-gray-500">
            By confirming, you agree to attend this appointment at the scheduled time. Your card will be charged after the appointment is completed.
          </p>
        </>
      ) : null}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </main>
  );
}
