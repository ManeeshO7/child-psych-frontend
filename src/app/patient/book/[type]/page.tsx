"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { slugToType } from "../types";

type Slot = { start: string; end: string };

const PRACTICE_TZ = "America/Los_Angeles";

// Match backend: same window as doctor (90 days ahead). Patient calendar shows all months in this range.
const AVAILABILITY_DAYS_AHEAD = 90;
const CALENDAR_DATE_STRINGS: string[] = (() => {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < AVAILABILITY_DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
})();

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
    [key: string]: { amountCents: number; amountDollars: number; formatted: string };
  };
};

type AllowedType = { type: string; durationMinutes: number; label: string };

export default function PatientBookTypePage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params?.type === "string" ? params.type : "";
  const backendType = slug ? slugToType(slug) : null;

  const [allowedTypes, setAllowedTypes] = useState<AllowedType[]>([]);
  const [typeInfo, setTypeInfo] = useState<AllowedType | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [pendingForms, setPendingForms] = useState<{ hasPendingForms: boolean; pendingCount: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const timeSlotSectionRef = useRef<HTMLDivElement>(null);

  // Resolve type info from allowed-types (so we get label + duration from API)
  useEffect(() => {
    if (!backendType) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [allowedRes, pricingRes, formsRes] = await Promise.all([
          fetch("/api/appointments/allowed-types", { credentials: "include" }),
          fetch("/api/payments/pricing"),
          fetch("/api/patient-forms/check-pending", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (allowedRes.ok) {
          const data = await allowedRes.json();
          const list = (data.allowedTypes || []) as AllowedType[];
          const all = (data.allTypes || list) as AllowedType[];
          setAllowedTypes(list);
          const info = all.find((t) => t.type === backendType) ?? list.find((t) => t.type === backendType);
          setTypeInfo(info ?? null);
        }
        if (pricingRes.ok) setPricing(await pricingRes.json());
        if (formsRes.ok) setPendingForms(await formsRes.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [backendType]);

  const isAllowed = typeInfo ? allowedTypes.some((a) => a.type === typeInfo.type) : false;

  // Scroll to time slot section when user selects a date
  useEffect(() => {
    if (selectedDate && timeSlotSectionRef.current) {
      timeSlotSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate]);

  // Clear selected slot when the date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  useEffect(() => {
    if (!typeInfo || !isAllowed) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    async function loadSlots() {
      try {
        const duration = typeInfo?.durationMinutes ?? 30;
        const res = await fetch(
          `/api/availability/slots?durationMinutes=${duration}`,
          { credentials: "include" }
        );
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots || []);
        } else {
          setSlots([]);
        }
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [typeInfo?.type, typeInfo?.durationMinutes, isAllowed]);

  const { byDate, sortedDates, months } = useMemo(() => {
    const by: Record<string, Slot[]> = {};
    for (const slot of slots) {
      const key = slot.start.slice(0, 10);
      if (!by[key]) by[key] = [];
      by[key].push(slot);
    }
    const sorted = Object.keys(by).sort();
    // Build months from the full 90-day window (same as doctor) so patient can navigate all months
    const monthMap = new Map<string, string[]>();
    for (const d of CALENDAR_DATE_STRINGS) {
      const monthKey = d.slice(0, 7);
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
      monthMap.get(monthKey)!.push(d);
    }
    const monthKeys = Array.from(monthMap.keys()).sort();
    const monthsList = monthKeys.map((monthKey) => {
      const dates = monthMap.get(monthKey)!;
      const first = new Date(dates[0] + "T12:00:00");
      const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { monthKey, label, dates };
    });
    return { byDate: by, sortedDates: sorted, months: monthsList };
  }, [slots]);

  const safeMonthIndex = months.length === 0 ? 0 : Math.min(Math.max(currentMonthIndex, 0), months.length - 1);
  const currentMonth = months[safeMonthIndex] ?? null;

  const calendarGrid = useMemo(() => {
    if (!currentMonth) return { firstDayOfWeek: 0, lastDate: 0, monthKey: "", year: 0, month: 0 };
    const [y, m] = currentMonth.monthKey.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const firstDayOfWeek = first.getDay();
    const lastDate = last.getDate();
    return { firstDayOfWeek, lastDate, monthKey: currentMonth.monthKey, year: y, month: m };
  }, [currentMonth]);

  const datesWithSlots = useMemo(() => new Set(sortedDates), [sortedDates]);
  const slotsForSelected = selectedDate ? (byDate[selectedDate] ?? []) : [];
  const canBook = !pendingForms?.hasPendingForms;

  function bookSelectedSlot() {
    if (!typeInfo || pendingForms?.hasPendingForms || !selectedSlot) return;
    setSubmitting(selectedSlot.start);
    router.push(
      `/patient/save-card?slotStart=${encodeURIComponent(selectedSlot.start)}&slotEnd=${encodeURIComponent(selectedSlot.end)}&type=${encodeURIComponent(typeInfo.type)}&durationMinutes=${encodeURIComponent(String(typeInfo.durationMinutes))}`,
    );
    setSubmitting(null);
  }

  if (loading && backendType) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="mb-6">
          <Link href="/patient/book" className="text-sm text-cta hover:underline">
            ← Back to appointment types
          </Link>
        </p>
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  if (!slug || !backendType) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="mb-6">
          <Link href="/patient/book" className="text-sm text-cta hover:underline">
            ← Back to appointment types
          </Link>
        </p>
        <p className="text-gray-600">Invalid appointment type.</p>
        <Link href="/patient/book" className="mt-4 inline-block text-cta hover:underline">
          Choose appointment type
        </Link>
      </main>
    );
  }

  if (!loading && (!typeInfo || !isAllowed)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="mb-6">
          <Link href="/patient/book" className="text-sm text-cta hover:underline">
            ← Back to appointment types
          </Link>
        </p>
        <p className="text-gray-600">
          This appointment type is not available for you at this time.
        </p>
        <Link href="/patient/book" className="mt-4 inline-block text-cta hover:underline">
          Choose another type
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/patient/book" className="text-sm text-cta hover:underline">
          ← Back to appointment types
        </Link>
      </p>
      <h1 className="section-heading">Book: {typeInfo?.label ?? slug}</h1>
      <p className="mt-2 text-gray-600">
        Choose a date, then a time. Your confirmation and video visit link will be sent by email.
      </p>

      {pendingForms?.hasPendingForms && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            You have {pendingForms.pendingCount} pending form{pendingForms.pendingCount === 1 ? "" : "s"} to complete before booking.
          </p>
          <Link href="/patient/forms" className="mt-2 inline-block text-sm font-medium text-amber-900 hover:underline">
            Complete forms →
          </Link>
        </div>
      )}

      {typeInfo && pricing?.pricing?.[typeInfo.type] && (
        <div className="mt-3 rounded-lg border border-cta/20 bg-cream-50 p-3">
          <p className="text-sm font-medium text-cta">
            Visit fee: {pricing.pricing[typeInfo.type].formatted}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            You will be asked to save your card on file. You will not be charged now; the practice will charge {pricing.pricing[typeInfo.type].formatted} after your visit.
          </p>
        </div>
      )}
      <p className="mt-1 text-sm text-gray-500">
        Times are shown in Pacific Time (America/Los_Angeles).
      </p>

      {slotsLoading ? (
        <p className="mt-6 text-gray-500">Loading available slots…</p>
      ) : sortedDates.length === 0 ? (
        <div className="mt-8 rounded-lg border border-cream-200 bg-cream-50 p-6 text-center">
          <p className="text-gray-600">No availability in the next 60 days for {typeInfo?.label}.</p>
          <p className="mt-2 text-sm text-gray-500">Please check back later or contact the practice.</p>
          <Link href="/patient/book" className="mt-4 inline-block text-cta hover:underline">
            ← Back to appointment types
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="rounded-xl border border-cream-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-navy">1. Pick a date</h2>
            <p className="mt-1 text-sm text-gray-500">
              Available dates show {typeInfo?.durationMinutes}-minute slots for {typeInfo?.label}.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentMonthIndex((i) => Math.max(0, i - 1))}
                disabled={currentMonthIndex === 0}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="text-sm font-medium text-navy">{currentMonth?.label ?? ""}</span>
              <button
                type="button"
                onClick={() => setCurrentMonthIndex((i) => Math.min(months.length - 1, i + 1))}
                disabled={currentMonthIndex >= months.length - 1}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="mt-3">
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: calendarGrid.firstDayOfWeek }, (_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: calendarGrid.lastDate }, (_, i) => {
                  const day = i + 1;
                  const { monthKey, year, month } = calendarGrid;
                  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasSlots = datesWithSlots.has(iso);
                  const isSelected = selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => hasSlots && setSelectedDate(iso)}
                      disabled={!hasSlots}
                      className={`aspect-square rounded-lg text-sm font-medium transition ${
                        !hasSlots
                          ? "cursor-default text-gray-300"
                          : isSelected
                            ? "bg-cta text-white"
                            : "bg-cream-50 text-cta hover:bg-cream-100"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedDate && (
            <div ref={timeSlotSectionRef} className="rounded-xl border border-cream-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-navy">2. Select a time slot</h2>
              <p className="mt-1 text-sm text-gray-600">
                {formatSlotDate(slotsForSelected[0]?.start ?? selectedDate)} · {typeInfo?.durationMinutes}-min {typeInfo?.label}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {slotsForSelected.map((slot, index) => {
                  const isSelected = selectedSlot?.start === slot.start;
                  return (
                    <button
                      key={`${slot.start}-${slot.end}-${index}`}
                      type="button"
                      onClick={() => canBook && setSelectedSlot(slot)}
                      disabled={!canBook}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition disabled:opacity-50 ${
                        isSelected
                          ? "border-cta bg-cta text-white"
                          : "border-cream-200 bg-white text-cta hover:border-cta/50 hover:bg-cream-50"
                      }`}
                    >
                      {formatSlotTime(slot.start)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-between items-center">
            <Link href="/patient/book" className="btn-secondary">
              Cancel
            </Link>
            {selectedDate && (
              <button
                type="button"
                onClick={bookSelectedSlot}
                disabled={!canBook || !selectedSlot || submitting !== null}
                className="inline-flex items-center rounded-lg border border-cta bg-white px-4 py-2.5 text-sm font-medium text-cta hover:bg-cream-50"
              >
                {submitting ? "Next…" : "Next"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
