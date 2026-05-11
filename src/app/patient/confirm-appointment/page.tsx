"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Practice timezone (California) – always show appointments in Pacific time
const PRACTICE_TZ = "America/Los_Angeles";

function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    timeZone: PRACTICE_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatSlotDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    timeZone: PRACTICE_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getTimezoneLabel(): string {
  const d = new Date();
  const tzName = d.toLocaleTimeString("en-US", {
    timeZone: PRACTICE_TZ,
    timeZoneName: "short",
  });
  const match = tzName.match(/\s([A-Z]{3,4})$/);
  return match ? match[1] : "PT";
}

type Pricing = {
  pricing: {
    [key: string]: {
      amountCents: number;
      amountDollars: number;
      formatted: string;
    };
  };
};

export default function ConfirmAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotStart = searchParams.get("slotStart");
  const slotEnd = searchParams.get("slotEnd");
  const visitType = searchParams.get("type") || "intake";
  const durationParam = searchParams.get("durationMinutes");
  const durationMinutes = durationParam ? parseInt(durationParam, 10) || 30 : 30;
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slotStart) {
      setError("Missing appointment slot information");
      setLoading(false);
      return;
    }
    // Load pricing
    fetch("/api/payments/pricing")
      .then((res) => res.json())
      .then((data) => {
        setPricing(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load pricing information");
        setLoading(false);
      });
  }, [slotStart]);

  async function handleConfirm() {
    if (!slotStart) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: slotStart,
          durationMinutes,
          type: visitType,
          notes: undefined,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Failed to book appointment");
        setConfirming(false);
        return;
      }
      // Success - redirect to patient dashboard
      router.push("/patient");
      router.refresh();
    } catch {
      setError("Network error while booking appointment");
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  if (error && !slotStart) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="section-heading">Confirm appointment</h1>
        <p className="mt-2 text-red-600">{error}</p>
        <Link href="/patient/book" className="mt-4 inline-block text-cta hover:underline">
          ← Back to booking
        </Link>
      </main>
    );
  }

  if (!slotStart) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="section-heading">Confirm appointment</h1>
        <p className="mt-2 text-gray-600">No appointment slot selected.</p>
        <Link href="/patient/book" className="mt-4 inline-block text-cta hover:underline">
          ← Back to booking
        </Link>
      </main>
    );
  }

  const tzLabel = getTimezoneLabel();
  const visitPrice =
    pricing?.pricing?.[visitType] ?? pricing?.pricing?.[String(durationMinutes)];

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="section-heading">Confirm your appointment</h1>
      <p className="mt-2 text-gray-600">
        Please review your appointment details below. Your card has been saved securely and you will be charged after you attend your appointment.
      </p>

      <div className="mt-6 rounded-lg border border-cream-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-cta mb-4">Appointment Details</h2>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Date & Time</p>
            <p className="text-base font-medium text-navy">
              {formatSlotDate(slotStart)}, {formatSlotTime(slotStart)} {tzLabel}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-base font-medium text-navy">
              {durationMinutes} minute{durationMinutes === 1 ? "" : "s"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Appointment Type</p>
            <p className="text-base font-medium text-navy capitalize">{visitType.replace(/_/g, " ")}</p>
          </div>

          {visitPrice && (
            <div className="mt-4 pt-4 border-t border-cream-200">
              <p className="text-sm text-gray-600">Visit Fee</p>
              <p className="text-lg font-semibold text-cta">{visitPrice.formatted}</p>
              <p className="mt-1 text-xs text-gray-500">
                You will be charged {visitPrice.formatted} after you attend your appointment. Your card on file will be used for payment.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          className="btn-primary disabled:opacity-50"
        >
          {confirming ? "Confirming…" : "Confirm appointment"}
        </button>
        <Link href="/patient" className="btn-secondary">
          Cancel
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-500">
        By confirming, you agree to attend this appointment at the scheduled time. Your card will be charged after the appointment is completed.
      </p>
    </main>
  );
}
