"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Slot = { start: string; end: string };

// Practice timezone (California) – always show patient slots in Pacific time
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
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export default function PatientBookPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [slotsRes, pricingRes] = await Promise.all([
          fetch("/api/availability/slots"),
          fetch("/api/payments/pricing"),
        ]);
        if (cancelled) return;
        if (slotsRes.ok) {
          const data = await slotsRes.json();
          setSlots(data.slots || []);
        }
        if (pricingRes.ok) {
          const pricingData = await pricingRes.json();
          setPricing(pricingData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function bookSlot(slot: Slot) {
    // Do not create the appointment yet. First, require the patient to save a card.
    setSubmitting(slot.start);
    try {
      router.push(
        `/patient/save-card?slotStart=${encodeURIComponent(
          slot.start,
        )}&slotEnd=${encodeURIComponent(slot.end)}&type=${encodeURIComponent("intake")}`,
      );
    } finally {
      setSubmitting(null);
    }
  }

  // Group slots by date
  const byDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = slot.start.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="section-heading">Book an appointment</h1>
      <p className="mt-2 text-gray-600">
        Choose an available 30-minute slot. Your confirmation and video visit link will be sent by email.
      </p>
      {pricing?.pricing?.intake && (
        <div className="mt-3 rounded-lg border border-warm-brown/20 bg-cream-50 p-3">
          <p className="text-sm font-medium text-warm-brown">
            Visit fee: {pricing.pricing.intake.formatted}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            You will be asked to save your card on file. You will not be charged now; the practice will charge {pricing.pricing.intake.formatted} after your visit.
          </p>
        </div>
      )}
      <p className="mt-1 text-sm text-gray-500">
        Times are shown in Pacific Time (America/Los_Angeles).
      </p>

      {loading ? (
        <p className="mt-8 text-gray-500">Loading available slots…</p>
      ) : sortedDates.length === 0 ? (
        <div className="mt-8 rounded-lg border border-cream-200 bg-cream-50 p-6 text-center">
          <p className="text-gray-600">No availability in the next 7 days.</p>
          <p className="mt-2 text-sm text-gray-500">Please check back later or contact the practice.</p>
          <Link href="/patient" className="mt-4 inline-block text-warm-brown hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <h2 className="text-lg font-semibold text-warm-brown">
                {formatSlotDate(byDate[dateKey][0].start)}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {byDate[dateKey].map((slot, index) => (
                  <button
                    key={`${slot.start}-${slot.end}-${index}`}
                    type="button"
                    onClick={() => bookSlot(slot)}
                    disabled={submitting !== null}
                    className="rounded-lg border border-cream-200 bg-white px-4 py-2 text-sm font-medium text-warm-brown shadow-sm transition hover:border-warm-brown/50 hover:bg-cream-50 disabled:opacity-50"
                  >
                    {submitting === slot.start ? "Booking…" : formatSlotTime(slot.start)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-4">
            <Link href="/patient" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
