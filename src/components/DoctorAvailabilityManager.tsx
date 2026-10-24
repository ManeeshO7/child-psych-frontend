"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { getCalendarStatus } from "@/lib/calendarStatus";

const DURATION_OPTIONS = [30, 45, 75] as const;

type Block = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  allowedDurationsMinutes?: number[] | null;
};

// How many days ahead doctors can configure and patients can see availability.
const AVAILABILITY_DAYS_AHEAD = 90; // 3 months
// How many past days to show in the calendar (grayed out, not clickable).
const CALENDAR_DAYS_BACK = 45;

const NEXT_DAYS: string[] = (() => {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < AVAILABILITY_DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
})();

const PREV_DAYS: string[] = (() => {
  const out: string[] = [];
  const today = new Date();
  for (let i = 1; i <= CALENDAR_DAYS_BACK; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.unshift(d.toISOString().slice(0, 10));
  }
  return out;
})();

const TODAY_ISO = NEXT_DAYS[0];
const ALL_CALENDAR_DAYS = [...PREV_DAYS, ...NEXT_DAYS];

const ORDERED_MONTH_KEYS = Array.from(
  new Map(
    ALL_CALENDAR_DAYS.map((iso) => {
      const d = new Date(iso + "T12:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return [key, key];
    })
  ).keys()
);
const TODAY_MONTH_KEY = (() => {
  const d = new Date(TODAY_ISO + "T12:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();
const INITIAL_MONTH_INDEX = (() => {
  const idx = ORDERED_MONTH_KEYS.indexOf(TODAY_MONTH_KEY);
  return idx >= 0 ? idx : 0;
})();

const normalizeDate = (d: string) => (d.includes("T") ? d.slice(0, 10) : d);

// Normalize time input to "HH:MM" (24h).
function normalizeTimeToHHMM(timeStr: string): string {
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function DoctorAvailabilityManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [saveMessage, setSaveMessage] = useState<"saved" | "error" | null>(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(INITIAL_MONTH_INDEX);

  const [selectedDate, setSelectedDate] = useState<string>(NEXT_DAYS[0]);
  const [showAddRange, setShowAddRange] = useState(false);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("12:00");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [slotsSaveErrorMessage, setSlotsSaveErrorMessage] = useState<string | null>(null);

  // Slot preview: which duration tab is active, and which starts are offered per (date, duration)
  const [slotDuration, setSlotDuration] = useState<30 | 45 | 75>(30);
  const [candidateSlots, setCandidateSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [offeredStartTimes, setOfferedStartTimes] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsSaving, setSlotsSaving] = useState(false);
  const [slotsDirty, setSlotsDirty] = useState(false);
  const [slotsSaveMessage, setSlotsSaveMessage] = useState<"saved" | "error" | null>(null);
  const saveMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotsSaveMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveMessageTimeoutRef.current) clearTimeout(saveMessageTimeoutRef.current);
      if (slotsSaveMessageTimeoutRef.current) clearTimeout(slotsSaveMessageTimeoutRef.current);
    };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [availRes, connected] = await Promise.all([
        fetch("/api/availability/", { credentials: "include" }),
        getCalendarStatus(),
      ]);
      if (availRes.ok) {
        const data = await availRes.json();
        setBlocks(data.blocks || []);
      }
      setCalendarConnected(connected);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadSlotsForSelection() {
    setSlotsLoading(true);
    try {
      const [candRes, offRes] = await Promise.all([
        fetch(
          `/api/availability/candidate-slots?date=${encodeURIComponent(selectedDate)}&durationMinutes=${slotDuration}`,
          { credentials: "include" }
        ),
        fetch(
          `/api/availability/offered-slots?date=${encodeURIComponent(selectedDate)}&durationMinutes=${slotDuration}`,
          { credentials: "include" }
        ),
      ]);
      const candidateList = candRes.ok ? (await candRes.json()).slots || [] : [];
      setCandidateSlots(candidateList);
      const offered: string[] = offRes.ok ? (await offRes.json()).startTimes || [] : [];
      const initialSelected = offered.length > 0 ? offered : candidateList.map((s: { startTime: string }) => s.startTime);
      setOfferedStartTimes(initialSelected);
      setSlotsDirty(false);
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    loadSlotsForSelection();
    // Keep calendar month synced to the selected date
    const d = new Date(selectedDate + "T12:00:00");
    const targetMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = ORDERED_MONTH_KEYS.indexOf(targetMonthKey);
    if (idx >= 0 && idx !== currentMonthIndex) setCurrentMonthIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, slotDuration, loading]);

  function toggleSlotOffered(startTime: string) {
    setOfferedStartTimes((prev) =>
      prev.includes(startTime) ? prev.filter((t) => t !== startTime) : [...prev, startTime].sort()
    );
    setSlotsDirty(true);
  }

  async function saveOfferedSlots() {
    setSlotsSaveMessage(null);
    setSlotsSaveErrorMessage(null);
    setSlotsSaving(true);
    try {
      const res = await fetch("/api/availability/offered-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: selectedDate,
          durationMinutes: slotDuration,
          startTimes: offeredStartTimes,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/doctor/login";
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSlotsSaveMessage("error");
        setSlotsSaveErrorMessage(err.detail || "Failed to save slots.");
        return;
      }
      const data = await res.json();
      setOfferedStartTimes(data.startTimes || []);
      setSlotsDirty(false);
      setSlotsSaveMessage("saved");
      if (slotsSaveMessageTimeoutRef.current) clearTimeout(slotsSaveMessageTimeoutRef.current);
      slotsSaveMessageTimeoutRef.current = setTimeout(() => {
        setSlotsSaveMessage(null);
        slotsSaveMessageTimeoutRef.current = null;
      }, 3000);
    } catch (e) {
      setSlotsSaveMessage("error");
      setSlotsSaveErrorMessage("Could not save. Is the backend running?");
    } finally {
      setSlotsSaving(false);
    }
  }

  function getAllowedForBlock(b: Block): number[] {
    const a = b.allowedDurationsMinutes;
    if (a != null && Array.isArray(a) && a.length > 0) return a;
    return [...DURATION_OPTIONS];
  }

  // Persist the full blocks array (backend replaces the whole 90-day window on every save).
  async function persistBlocks(nextBlocks: Block[]) {
    const payload = nextBlocks.map((b) => {
      const allowed = getAllowedForBlock(b);
      return {
        date: normalizeDate(b.date),
        startTime: b.startTime,
        endTime: b.endTime,
        allowedDurationsMinutes: allowed.length === DURATION_OPTIONS.length ? null : allowed,
      };
    });
    setSaveMessage(null);
    setSaveErrorMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/availability/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/doctor/login";
        return false;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveMessage("error");
        setSaveErrorMessage(err.detail || "Failed to save.");
        return false;
      }
      const data = await res.json();
      setBlocks(data.blocks || []);
      setSaveMessage("saved");
      if (saveMessageTimeoutRef.current) clearTimeout(saveMessageTimeoutRef.current);
      saveMessageTimeoutRef.current = setTimeout(() => {
        setSaveMessage(null);
        saveMessageTimeoutRef.current = null;
      }, 3000);
      return true;
    } catch (e) {
      setSaveMessage("error");
      setSaveErrorMessage(
        "Could not save. Is the backend running? In frontend .env, set BACKEND_URL to where the backend runs (e.g. http://localhost:8002)."
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addRange() {
    setRangeError(null);
    if (newStart >= newEnd) {
      setRangeError("Start time must be before end time.");
      return;
    }
    const start = normalizeTimeToHHMM(newStart);
    const end = normalizeTimeToHHMM(newEnd);
    const next: Block[] = [
      ...blocks,
      {
        id: `new-${Date.now()}`,
        date: selectedDate,
        startTime: start,
        endTime: end,
        allowedDurationsMinutes: [...DURATION_OPTIONS],
      },
    ];
    setBlocks(next);
    setShowAddRange(false);
    const ok = await persistBlocks(next);
    if (ok) await loadSlotsForSelection();
  }

  async function removeRange(id: string) {
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next);
    const ok = await persistBlocks(next);
    if (ok) await loadSlotsForSelection();
  }

  async function toggleDurationForBlock(blockId: string, dur: number) {
    const next = blocks.map((b) => {
      if (b.id !== blockId) return b;
      const allowed = getAllowedForBlock(b);
      const updated = allowed.includes(dur) ? allowed.filter((x) => x !== dur) : [...allowed, dur].sort((a, c) => a - c);
      return { ...b, allowedDurationsMinutes: updated.length ? updated : [...DURATION_OPTIONS] };
    });
    setBlocks(next);
    const ok = await persistBlocks(next);
    if (ok) await loadSlotsForSelection();
  }

  const formatDate = (d: string) => {
    const dateOnly = normalizeDate(d);
    const date = new Date(dateOnly + "T12:00:00");
    if (Number.isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  };

  const formatTimeAmPm = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return time;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
  };

  const datesWithBlocks = useMemo(() => new Set(blocks.map((b) => normalizeDate(b.date))), [blocks]);

  const rangesForSelected = useMemo(
    () =>
      blocks
        .filter((b) => normalizeDate(b.date) === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [blocks, selectedDate]
  );

  type CalendarDay = { iso: string; dateObj: Date; dow: number; dom: number; monthKey: string };

  const calendarDays: CalendarDay[] = ALL_CALENDAR_DAYS.map((iso) => {
    const dateObj = new Date(iso + "T12:00:00");
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    return {
      iso,
      dateObj,
      dow: dateObj.getDay(),
      dom: dateObj.getDate(),
      monthKey: `${year}-${String(month + 1).padStart(2, "0")}`,
    };
  });

  type CalendarMonth = { label: string; days: CalendarDay[] };

  const monthMap = new Map<string, CalendarMonth>();
  for (const day of calendarDays) {
    if (!monthMap.has(day.monthKey)) {
      const label = day.dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      monthMap.set(day.monthKey, { label, days: [] });
    }
    monthMap.get(day.monthKey)!.days.push(day);
  }
  const months: CalendarMonth[] = Array.from(monthMap.values());
  const safeMonthIndex = months.length === 0 ? 0 : Math.min(Math.max(currentMonthIndex, 0), months.length - 1);
  const currentMonth = months.length > 0 ? months[safeMonthIndex] : null;

  const calendarGrid = currentMonth && (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonthIndex((i) => Math.max(i - 1, 0))}
          disabled={safeMonthIndex === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 text-gray-500 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold tracking-wide text-gray-700">{currentMonth.label}</span>
        <button
          type="button"
          onClick={() => setCurrentMonthIndex((i) => Math.min(i + 1, Math.max(months.length - 1, 0)))}
          disabled={safeMonthIndex >= Math.max(months.length - 1, 0)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 text-gray-500 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, idx) => (
          <div
            key={`${d}-${idx}`}
            className="flex h-8 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-gray-400"
          >
            {d}
          </div>
        ))}
        {(() => {
          const cells: (CalendarDay | null)[] = [];
          if (currentMonth.days.length > 0) {
            for (let i = 0; i < currentMonth.days[0].dow; i++) cells.push(null);
            for (const d of currentMonth.days) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);
          }
          return cells.map((cell, idx) => {
            if (!cell) return <div key={`pad-${idx}`} className="h-9" />;
            const iso = cell.iso;
            const isPast = iso < TODAY_ISO;
            const isSelected = iso === selectedDate;
            const isToday = iso === TODAY_ISO;
            const hasBlocks = datesWithBlocks.has(iso);
            if (isPast) {
              return (
                <span
                  key={iso}
                  className="flex h-9 items-center justify-center text-xs text-gray-300 cursor-not-allowed"
                  aria-hidden
                >
                  {cell.dom}
                </span>
              );
            }
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={[
                  "relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition",
                  isSelected
                    ? "bg-cta text-white shadow-md"
                    : hasBlocks
                    ? "bg-cta/10 text-cta hover:bg-cta/20"
                    : "text-gray-600 hover:bg-cream-100",
                  isToday && !isSelected ? "ring-2 ring-cta/40 ring-offset-1" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {cell.dom}
                {hasBlocks && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-cta/60" />
                )}
              </button>
            );
          });
        })()}
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-cream-50/60">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link href="/doctor" className="inline-flex items-center gap-1 text-sm text-cta hover:underline mb-3">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cta/10">
                <svg className="h-5 w-5 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy">Manage Availability</h1>
                <p className="text-sm text-gray-500">All times shown in Pacific Time (PST)</p>
              </div>
            </div>
          </div>

          {calendarConnected === true && (
            <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Google Calendar connected
            </div>
          )}
        </div>

        {calendarConnected === false && (
          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Connect Google Calendar for Meet links</p>
              <p className="mt-0.5 text-sm text-amber-700">Each patient booking will automatically get a unique Google Meet link.</p>
              <a
                href="/api/auth/google"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
              >
                Connect Google Calendar
              </a>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-7 w-7 animate-spin text-cta" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-gray-500">Loading availability…</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[280px_1fr_1fr]">
            {/* Calendar */}
            <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:self-start">
              <h2 className="mb-1 text-sm font-semibold text-gray-800">Select a day</h2>
              <p className="mb-4 text-xs text-gray-500">Days with a dot already have availability set.</p>
              {calendarGrid}
            </div>

            {/* Time ranges for the day */}
            <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm lg:self-start">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800">{formatDate(selectedDate)}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">The hours you're available this day.</p>
                  </div>
                  {!showAddRange && (
                    <button
                      type="button"
                      onClick={() => setShowAddRange(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-cta px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
                    >
                      + Add time range
                    </button>
                  )}
                </div>

                {rangesForSelected.length === 0 && !showAddRange && (
                  <div className="mt-4 rounded-xl border border-dashed border-cream-300 bg-cream-50 p-6 text-center">
                    <p className="text-sm text-gray-400">No hours set for this day yet.</p>
                    <p className="mt-1 text-xs text-gray-400">Click "+ Add time range" to get started.</p>
                  </div>
                )}

                {rangesForSelected.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {rangesForSelected.map((b) => {
                      const allowed = getAllowedForBlock(b);
                      return (
                        <div
                          key={b.id}
                          className="group flex items-start justify-between gap-4 rounded-xl border border-cream-200 bg-cream-50/60 px-5 py-4"
                        >
                          <div className="flex flex-col gap-1.5">
                            <span className="text-base font-semibold text-navy">
                              {formatTimeAmPm(b.startTime)} – {formatTimeAmPm(b.endTime)}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-xs text-gray-400">Allow:</span>
                              {DURATION_OPTIONS.map((dur) => {
                                const checked = allowed.includes(dur);
                                return (
                                  <label
                                    key={dur}
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                                      checked ? "border-cta/40 bg-cta/10 text-cta" : "border-cream-200 text-gray-400 hover:border-cream-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleDurationForBlock(b.id, dur)}
                                      className="sr-only"
                                    />
                                    {dur} min
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRange(b.id)}
                            className="mt-0.5 shrink-0 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showAddRange && (
                  <div className="mt-4 rounded-xl border border-cta/30 bg-cta/5 p-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">From (PST)</label>
                        <input
                          type="time"
                          value={newStart}
                          onChange={(e) => setNewStart(e.target.value)}
                          className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">To (PST)</label>
                        <input
                          type="time"
                          value={newEnd}
                          onChange={(e) => setNewEnd(e.target.value)}
                          className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addRange}
                        disabled={saving}
                        className="rounded-xl bg-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:opacity-60"
                      >
                        {saving ? "Saving…" : "Save range"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddRange(false);
                          setRangeError(null);
                        }}
                        className="rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-cream-50 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                    {rangeError && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600">
                        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {rangeError}
                      </p>
                    )}
                  </div>
                )}

                {saveMessage === "saved" && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Hours updated.
                  </p>
                )}
                {saveMessage === "error" && (
                  <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-red-600">
                    <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {saveErrorMessage || "Save failed. Try again."}
                  </p>
                )}
            </div>

            {/* Bookable slots preview for this day, derived from the ranges above */}
            <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm lg:self-start">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-gray-800">Bookable slots</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Toggle which times patients can actually book, per visit length.</p>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-cream-200 bg-cream-50 p-1">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSlotDuration(d)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        slotDuration === d ? "bg-cta text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>

                {slotsLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
                    <svg className="h-4 w-4 animate-spin text-cta" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Loading slots…
                  </div>
                ) : candidateSlots.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm font-semibold text-amber-900">No {slotDuration}-min slots available on this day</p>
                    <p className="mt-1 text-sm text-amber-700">
                      {rangesForSelected.length > 0
                        ? `None of your time ranges above allow ${slotDuration}-min appointments. Check the "Allow" tags on a range, or add a new one.`
                        : 'Add a time range above (e.g. 9:00–12:00) and slots will appear here automatically.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOfferedStartTimes(candidateSlots.map((s) => s.startTime));
                          setSlotsDirty(true);
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                      >
                        Select all ({candidateSlots.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOfferedStartTimes([]);
                          setSlotsDirty(true);
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                      >
                        Deselect all
                      </button>
                      <span className="text-xs text-cta font-medium">
                        {offeredStartTimes.length} of {candidateSlots.length} selected
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                      {candidateSlots.map((slot) => {
                        const offered = offeredStartTimes.includes(slot.startTime);
                        return (
                          <label
                            key={slot.startTime}
                            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition ${
                              offered
                                ? "border-cta bg-cta/8 text-cta shadow-sm"
                                : "border-cream-200 bg-white text-gray-600 hover:border-cream-300 hover:bg-cream-50"
                            }`}
                          >
                            <input type="checkbox" checked={offered} onChange={() => toggleSlotOffered(slot.startTime)} className="sr-only" />
                            <span className="text-sm font-semibold">{formatTimeAmPm(slot.startTime)}</span>
                            <span className="text-[11px] text-gray-400">→ {formatTimeAmPm(slot.endTime)}</span>
                            {offered && <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-cta">✓ Offered</span>}
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-cream-100 pt-5">
                      <button
                        type="button"
                        onClick={saveOfferedSlots}
                        disabled={slotsSaving || !slotsDirty}
                        className="btn-primary disabled:opacity-60"
                      >
                        {slotsSaving ? (
                          <span className="flex items-center gap-2">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Saving…
                          </span>
                        ) : slotsDirty ? (
                          "Save slot selection"
                        ) : (
                          "Up to date"
                        )}
                      </button>
                      {slotsSaveMessage === "saved" && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Saved!
                        </span>
                      )}
                      {slotsSaveMessage === "error" && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {slotsSaveErrorMessage || "Save failed. Try again."}
                        </span>
                      )}
                    </div>
                  </>
                )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
