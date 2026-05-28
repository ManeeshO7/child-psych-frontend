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

  const backLink = (
    <Link href="/patient/book" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cta transition-colors">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      Back to appointment types
    </Link>
  );

  if (loading && backendType) {
    return (
      <div className="min-h-screen bg-cream-50/60">
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
          {backLink}
          <div className="mt-8 flex items-center gap-3 text-gray-400">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading…
          </div>
        </main>
      </div>
    );
  }

  if (!slug || !backendType) {
    return (
      <div className="min-h-screen bg-cream-50/60">
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
          {backLink}
          <p className="mt-8 text-gray-600">Invalid appointment type.</p>
          <Link href="/patient/book" className="mt-4 inline-block text-cta hover:underline">Choose appointment type</Link>
        </main>
      </div>
    );
  }

  if (!loading && (!typeInfo || !isAllowed)) {
    return (
      <div className="min-h-screen bg-cream-50/60">
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
          {backLink}
          <p className="mt-8 text-gray-600">This appointment type is not available for you at this time.</p>
          <Link href="/patient/book" className="mt-4 inline-block text-cta hover:underline">Choose another type</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50/60">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        {backLink}

        {/* Page heading */}
        <div className="mt-6">
          <h1 className="text-3xl font-bold text-navy">Book: {typeInfo?.label ?? slug}</h1>
          <p className="mt-2 text-gray-500">
            Choose a date, then a time. Your confirmation and video visit link will be sent by email.
          </p>
        </div>

        {/* Pending forms banner */}
        {pendingForms?.hasPendingForms && (
          <div className="mt-6 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                {pendingForms.pendingCount} pending form{pendingForms.pendingCount === 1 ? "" : "s"} to complete
              </p>
              <p className="mt-0.5 text-sm text-amber-800">Please complete your assigned forms before booking a new appointment.</p>
              <Link href="/patient/forms" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
                Complete forms
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Visit fee + timezone info */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
          {typeInfo && pricing?.pricing?.[typeInfo.type] && (
            <div className="flex-1 flex items-start gap-3 rounded-2xl border-2 border-gray-300 bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cta/10 text-cta">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">Visit fee: {pricing.pricing[typeInfo.type].formatted}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  You will be asked to save your card on file. You will not be charged now; the practice will charge {pricing.pricing[typeInfo.type].formatted} after your visit.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border-2 border-gray-300 bg-white px-4 py-3 shadow-sm sm:shrink-0">
            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">Times shown in Pacific Time</span>
          </div>
        </div>

        {slotsLoading ? (
          <div className="mt-8 flex items-center gap-3 text-gray-400">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading available slots…
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="mt-8 flex items-start gap-4 rounded-2xl border-2 border-gray-300 bg-white p-6 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v3m10.5-3v3M3.75 9.75h16.5M5.25 6.75h13.5A1.5 1.5 0 0120.25 8.25v11.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-navy">No availability right now</p>
              <p className="mt-0.5 text-sm text-gray-500">No slots in the next 90 days for {typeInfo?.label}. Please check back later or contact the practice.</p>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">

            {/* Step 1 — Pick a date */}
            <div className="overflow-hidden rounded-2xl border-2 border-gray-300 bg-white shadow-sm">
              <div className="rounded-t-2xl border-b-2 border-gray-300 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cta/10 text-cta">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v3m10.5-3v3M3.75 9.75h16.5M5.25 6.75h13.5A1.5 1.5 0 0120.25 8.25v11.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5z" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-semibold text-navy">1. Pick a date</h2>
                    <p className="text-xs text-gray-500">
                      Available dates show {typeInfo?.durationMinutes}-min slots for {typeInfo?.label}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentMonthIndex((i) => Math.max(0, i - 1))}
                    disabled={currentMonthIndex === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Previous month"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-navy">{currentMonth?.label ?? ""}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentMonthIndex((i) => Math.min(months.length - 1, i + 1))}
                    disabled={currentMonthIndex >= months.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Next month"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
                <div className="mt-4">
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: calendarGrid.firstDayOfWeek }, (_, i) => (
                      <div key={`pad-${i}`} className="aspect-square" />
                    ))}
                    {Array.from({ length: calendarGrid.lastDate }, (_, i) => {
                      const day = i + 1;
                      const { year, month } = calendarGrid;
                      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const hasSlots = datesWithSlots.has(iso);
                      const isSelected = selectedDate === iso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => hasSlots && setSelectedDate(iso)}
                          disabled={!hasSlots}
                          className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                            !hasSlots
                              ? "cursor-default text-gray-200"
                              : isSelected
                                ? "bg-cta text-white shadow-md"
                                : "bg-cta/8 text-cta hover:bg-cta/15 hover:shadow-sm"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 — Select a time */}
            {selectedDate && (
              <div ref={timeSlotSectionRef} className="overflow-hidden rounded-2xl border-2 border-gray-300 bg-white shadow-sm">
                <div className="rounded-t-2xl border-b-2 border-gray-300 bg-gray-50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cta/10 text-cta">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <div>
                      <h2 className="font-semibold text-navy">2. Select a time slot</h2>
                      <p className="text-xs text-gray-500">
                        {formatSlotDate(slotsForSelected[0]?.start ?? selectedDate)} · {typeInfo?.durationMinutes}-min
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {slotsForSelected.map((slot, index) => {
                      const isSelected = selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={`${slot.start}-${slot.end}-${index}`}
                          type="button"
                          onClick={() => canBook && setSelectedSlot(slot)}
                          disabled={!canBook}
                          className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                            isSelected
                              ? "border-cta bg-cta text-white shadow-md"
                              : "border-gray-200 bg-white text-cta hover:border-cta/50 hover:bg-cta/5"
                          }`}
                        >
                          {formatSlotTime(slot.start)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between pt-2">
              <Link href="/patient/book" className="btn-secondary">Cancel</Link>
              {selectedDate && (
                <button
                  type="button"
                  onClick={bookSelectedSlot}
                  disabled={!canBook || !selectedSlot || submitting !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cta/90 disabled:opacity-40"
                >
                  {submitting ? "Loading…" : "Next"}
                  {!submitting && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  )}
                </button>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
