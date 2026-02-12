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

export default function ConfirmScheduledPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [hasCard, setHasCard] = useState(false);
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
        const [apptRes, pmRes] = await Promise.all([
          fetch(`/api/appointments/${appointmentId}`, { credentials: "include" }),
          fetch("/api/payments/payment-method", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (apptRes.ok) {
          const data = await apptRes.json();
          setAppointment(data);
        }
        if (pmRes.ok) {
          const pm = await pmRes.json();
          setHasCard(Boolean(pm?.card?.last4));
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
  const typeLabel = appointment.type.replace(/_/g, " ");

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
        <p className="text-base font-medium text-gray-900">
          {formattedDate}, {formattedTime} PST
        </p>
        <p className="mt-1 text-sm text-gray-600">
          {appointment.durationMinutes} min · {typeLabel}
        </p>
      </div>

      {!hasCard ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Add your card first</p>
          <p className="mt-1 text-sm text-amber-800">
            Save your payment method before confirming. You will be charged after your visit.
          </p>
          <Link
            href={`/patient/save-card?appointmentId=${encodeURIComponent(appointmentId)}&returnTo=${encodeURIComponent(`/patient/confirm-scheduled?appointmentId=${appointmentId}`)}`}
            className="mt-3 inline-block rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
          >
            Save card →
          </Link>
        </div>
      ) : (
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
        </>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </main>
  );
}
