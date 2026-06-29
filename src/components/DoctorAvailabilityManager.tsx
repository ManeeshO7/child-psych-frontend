"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const DURATION_OPTIONS = [30, 45, 75] as const;

type Block = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  allowedDurationsMinutes?: number[] | null;
};

// How many days ahead doctors can configure and patients can see availability.
const AVAILABILITY_DAYS_AHEAD = 90;  // 3 months
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

// Order of months in the calendar (same as derived in component from ALL_CALENDAR_DAYS)
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

export default function DoctorAvailabilityManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addDate, setAddDate] = useState(NEXT_DAYS[0]);
  const [addStart, setAddStart] = useState("09:00");
  const [addEnd, setAddEnd] = useState("12:00");
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [saveMessage, setSaveMessage] = useState<"saved" | "error" | null>(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(INITIAL_MONTH_INDEX);
  const [activeTab, setActiveTab] = useState<"offer" | "blocks">("offer");
  const [blocksTabView, setBlocksTabView] = useState<"day" | "all">("day");
  const [allBlocksFilterDate, setAllBlocksFilterDate] = useState<string | "all">("all");

  // Offer-slots flow: duration → date → pick slots
  const [selectedDuration, setSelectedDuration] = useState<30 | 45 | 75>(30);
  const [selectedDateForSlots, setSelectedDateForSlots] = useState<string>(NEXT_DAYS[0]);
  const [candidateSlots, setCandidateSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsSaving, setSlotsSaving] = useState(false);
  const [slotsSaveMessage, setSlotsSaveMessage] = useState<"saved" | "error" | null>(null);
  const [offeredSlotsMonthIndex, setOfferedSlotsMonthIndex] = useState(INITIAL_MONTH_INDEX);
  const [selectedStartTimes, setSelectedStartTimes] = useState<string[]>([]);
  const saveMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveMessageTimeoutRef.current) clearTimeout(saveMessageTimeoutRef.current);
    };
  }, []);

  async function loadCandidateAndOfferedSlots() {
    setSlotsLoading(true);
    try {
      const [candRes, offRes] = await Promise.all([
        fetch(
          `/api/availability/candidate-slots?date=${encodeURIComponent(selectedDateForSlots)}&durationMinutes=${selectedDuration}`,
          { credentials: "include" }
        ),
        fetch(
          `/api/availability/offered-slots?date=${encodeURIComponent(selectedDateForSlots)}&durationMinutes=${selectedDuration}`,
          { credentials: "include" }
        ),
      ]);
      const candidateList = candRes.ok ? (await candRes.json()).slots || [] : [];
      setCandidateSlots(candidateList);
      const offered: string[] = offRes.ok ? (await offRes.json()).startTimes || [] : [];
      // If doctor hasn't saved offered slots for this date/duration yet, pre-select all candidate slots
      // so all availability is shown to patients unless they manually uncheck and save.
      const initialSelected = offered.length > 0 ? offered : candidateList.map((s: { startTime: string }) => s.startTime);
      setSelectedStartTimes(initialSelected);
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "offer") return;
    loadCandidateAndOfferedSlots();
  }, [activeTab, selectedDateForSlots, selectedDuration]);

  // Sync calendar month to show the selected date
  useEffect(() => {
    const targetIso = selectedDateForSlots.includes("T") ? selectedDateForSlots.slice(0, 10) : selectedDateForSlots;
    const d = new Date(targetIso + "T12:00:00");
    const targetMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const orderedMonthKeys = Array.from(
      new Map(
        ALL_CALENDAR_DAYS.map((iso) => {
          const dt = new Date(iso + "T12:00:00");
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
          return [key, key];
        })
      ).keys()
    );
    const idx = orderedMonthKeys.indexOf(targetMonthKey);
    if (idx >= 0 && idx !== offeredSlotsMonthIndex) setOfferedSlotsMonthIndex(idx);
  }, [selectedDateForSlots]);

  function toggleSlotOffered(startTime: string) {
    setSelectedStartTimes((prev) =>
      prev.includes(startTime) ? prev.filter((t) => t !== startTime) : [...prev, startTime].sort()
    );
  }

  async function saveOfferedSlots() {
    setSlotsSaveMessage(null);
    setSlotsSaving(true);
    try {
      const res = await fetch("/api/availability/offered-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: selectedDateForSlots.includes("T") ? selectedDateForSlots.slice(0, 10) : selectedDateForSlots,
          durationMinutes: selectedDuration,
          startTimes: selectedStartTimes,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/doctor/login";
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSlotsSaveMessage("error");
        alert(err.detail || "Failed to save slots");
        return;
      }
      const data = await res.json();
      setSelectedStartTimes(data.startTimes || []);
      setSlotsSaveMessage("saved");
      if (saveMessageTimeoutRef.current) clearTimeout(saveMessageTimeoutRef.current);
      saveMessageTimeoutRef.current = setTimeout(() => {
        setSlotsSaveMessage(null);
        saveMessageTimeoutRef.current = null;
      }, 3000);
    } catch (e) {
      setSlotsSaveMessage("error");
      alert("Could not save. Is the backend running?");
    } finally {
      setSlotsSaving(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [availRes, calRes] = await Promise.all([
        fetch("/api/availability/", { credentials: "include" }),
        fetch("/api/auth/calendar-status", { credentials: "include" }),
      ]);
      if (availRes.ok) {
        const data = await availRes.json();
        setBlocks(data.blocks || []);
      }
      if (calRes.ok) {
        const cal = await calRes.json();
        setCalendarConnected(cal.connected === true);
      } else {
        setCalendarConnected(false);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Normalize time input to "HH:MM" (24h). Input is treated as PST per the form labels.
  function normalizeTimeToHHMM(timeStr: string): string {
    const parts = timeStr.trim().split(":");
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function addBlock() {
    if (addStart >= addEnd) {
      alert("Start time must be before end time.");
      return;
    }
    // Use the entered times as PST (per "From (PST)" / "To (PST)" labels). No conversion.
    const practiceStart = normalizeTimeToHHMM(addStart);
    const practiceEnd = normalizeTimeToHHMM(addEnd);
    setBlocks((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        date: addDate,
        startTime: practiceStart,
        endTime: practiceEnd,
        allowedDurationsMinutes: [...DURATION_OPTIONS],
      },
    ]);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function getAllowedForBlock(b: Block): number[] {
    const a = b.allowedDurationsMinutes;
    if (a != null && Array.isArray(a) && a.length > 0) return a;
    return [...DURATION_OPTIONS];
  }

  function setAllowedForBlock(blockId: string, durations: number[]) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, allowedDurationsMinutes: durations } : b,
      ),
    );
  }

  async function save() {
    const payload = blocks.map((b) => {
      const allowed = getAllowedForBlock(b);
      return {
      date: b.date.includes("T") ? b.date.slice(0, 10) : b.date,
      startTime: b.startTime,
      endTime: b.endTime,
        allowedDurationsMinutes: allowed.length === DURATION_OPTIONS.length ? null : allowed,
      };
    });
    if (payload.length === 0) {
      alert("Add at least one block using the \"Add block\" button above, then click Save.");
      return;
    }
    setSaveMessage(null);
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
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveMessage("error");
        alert(err.detail || "Failed to save");
        return;
      }
      const data = await res.json();
      setBlocks(data.blocks || []);
      const refetch = await fetch("/api/availability/", { credentials: "include" });
      if (refetch.ok) {
        const refetchData = await refetch.json();
        setBlocks(refetchData.blocks || []);
      }
      setSaveMessage("saved");
      if (saveMessageTimeoutRef.current) clearTimeout(saveMessageTimeoutRef.current);
      saveMessageTimeoutRef.current = setTimeout(() => {
        setSaveMessage(null);
        saveMessageTimeoutRef.current = null;
      }, 3000);
    } catch (e) {
      setSaveMessage("error");
      alert("Could not save. Is the backend running? In frontend .env, set BACKEND_URL to where the backend runs (e.g. http://localhost:8002).");
    } finally {
      setSaving(false);
    }
  }

  const formatDate = (d: string) => {
    const dateOnly = d.includes("T") ? d.slice(0, 10) : d;
    const date = new Date(dateOnly + "T12:00:00");
    if (Number.isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  // Display time (stored as HH:MM in PST) as 12h AM/PM. All times are Pacific.
  const formatTimeAmPm = (_dateStr: string, time: string) => {
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return time;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
  };

  const normalizeDate = (d: string) => (d.includes("T") ? d.slice(0, 10) : d);
  const selectedDate = normalizeDate(addDate);

  const datesWithBlocks = new Set(blocks.map((b) => normalizeDate(b.date)));

  const blocksForSelected = blocks
    .filter((b) => normalizeDate(b.date) === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const allBlocksSorted = [...blocks].sort(
    (a, b) =>
      normalizeDate(a.date).localeCompare(normalizeDate(b.date)) ||
      a.startTime.localeCompare(b.startTime),
  );

  const uniqueBlockDates = Array.from(
    new Set(allBlocksSorted.map((b) => normalizeDate(b.date))),
  ).sort((a, b) => a.localeCompare(b));

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  type CalendarDay = {
    iso: string;
    dateObj: Date;
    dow: number; // day of week 0–6
    dom: number; // day of month
    monthKey: string; // e.g. "2026-02"
  };

  const calendarDays: CalendarDay[] = ALL_CALENDAR_DAYS.map((iso) => {
    const dateObj = new Date(iso + "T12:00:00");
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth(); // 0-based
    return {
      iso,
      dateObj,
      dow: dateObj.getDay(),
      dom: dateObj.getDate(),
      monthKey: `${year}-${String(month + 1).padStart(2, "0")}`,
    };
  });

  type CalendarMonth = {
    label: string;
    days: CalendarDay[];
  };

  const monthMap = new Map<string, CalendarMonth>();
  for (const day of calendarDays) {
    if (!monthMap.has(day.monthKey)) {
      const label = day.dateObj.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      monthMap.set(day.monthKey, { label, days: [] });
    }
    monthMap.get(day.monthKey)!.days.push(day);
  }

  const months: CalendarMonth[] = Array.from(monthMap.values());

  const safeMonthIndex =
    months.length === 0 ? 0 : Math.min(Math.max(currentMonthIndex, 0), months.length - 1);
  const currentMonth = months.length > 0 ? months[safeMonthIndex] : null;

  const calendarGrid = (
    month: CalendarMonth,
    selectedIso: string,
    onSelect: (iso: string) => void,
    monthIndex: number,
    setMonthIndex: (fn: (i: number) => number) => void,
  ) => (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setMonthIndex((i) => Math.max(i - 1, 0))}
          disabled={monthIndex === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 text-gray-500 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"
        >‹</button>
        <span className="text-sm font-semibold tracking-wide text-gray-700">{month.label}</span>
        <button
          type="button"
          onClick={() => setMonthIndex((i) => Math.min(i + 1, Math.max(months.length - 1, 0)))}
          disabled={monthIndex >= Math.max(months.length - 1, 0)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 text-gray-500 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next month"
        >›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d, idx) => (
          <div key={`${d}-${idx}`} className="flex h-8 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {d}
          </div>
        ))}
        {(() => {
          const cells: (CalendarDay | null)[] = [];
          if (month.days.length > 0) {
            for (let i = 0; i < month.days[0].dow; i++) cells.push(null);
            for (const d of month.days) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);
          }
          return cells.map((cell, idx) => {
            if (!cell) return <div key={`pad-${idx}`} className="h-9" />;
            const iso = cell.iso;
            const isPast = iso < TODAY_ISO;
            const isSelected = iso === selectedIso;
            const isToday = iso === TODAY_ISO;
            const hasBlocks = datesWithBlocks.has(iso);
            if (isPast) {
              return (
                <span key={iso} className="flex h-9 items-center justify-center text-xs text-gray-300 cursor-not-allowed" aria-hidden>
                  {cell.dom}
                </span>
              );
            }
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelect(iso)}
                className={[
                  "relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition",
                  isSelected
                    ? "bg-cta text-white shadow-md"
                    : hasBlocks
                      ? "bg-cta/10 text-cta hover:bg-cta/20"
                      : "text-gray-600 hover:bg-cream-100",
                  isToday && !isSelected ? "ring-2 ring-cta/40 ring-offset-1" : "",
                ].filter(Boolean).join(" ")}
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

  const blockCard = (b: Block, showDate = false) => (
    <div
      key={b.id}
      className="group flex items-start justify-between gap-4 rounded-xl border border-cream-200 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex flex-col gap-1.5">
        {showDate && (
          <span className="text-xs font-semibold uppercase tracking-wide text-cta">{formatDate(b.date)}</span>
        )}
        <span className="text-base font-semibold text-navy">
          {formatTimeAmPm(b.date, b.startTime)} – {formatTimeAmPm(b.date, b.endTime)}
        </span>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-xs text-gray-400">Allow:</span>
          {DURATION_OPTIONS.map((dur) => {
            const allowed = getAllowedForBlock(b);
            const checked = allowed.includes(dur);
            return (
              <label key={dur} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                checked ? "border-cta/40 bg-cta/10 text-cta" : "border-cream-200 text-gray-400 hover:border-cream-300"
              }`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? allowed.filter((x) => x !== dur)
                      : [...allowed, dur].sort((a, b) => a - b);
                    setAllowedForBlock(b.id, next.length ? next : [...DURATION_OPTIONS]);
                  }}
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
        onClick={() => removeBlock(b.id)}
        className="mt-0.5 shrink-0 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-100"
      >
        Remove
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-cream-50/60">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link href="/doctor" className="inline-flex items-center gap-1 text-sm text-cta hover:underline mb-3">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cta/10">
                <svg className="h-5 w-5 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
              <a href="/api/auth/google" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition">
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
          <>
            {/* Main tabs */}
            <div className="mb-6 inline-flex rounded-xl border border-cream-200 bg-white p-1 shadow-sm">
              {[
                { id: "offer" as const, label: "Offer Slots" },
                { id: "blocks" as const, label: `My Availability (${blocks.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab.id ? "bg-cta text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "offer" ? (
              <div className="space-y-5">

                {/* Step 1: Duration */}
                <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cta text-xs font-bold text-white">1</span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800">Appointment length</h2>
                      <p className="text-xs text-gray-500">Choose which duration you want to offer slots for</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {([30, 45, 75] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDuration(d)}
                        className={`rounded-xl border-2 px-6 py-3 text-sm font-semibold transition ${
                          selectedDuration === d
                            ? "border-cta bg-cta text-white shadow-md"
                            : "border-cream-200 bg-white text-gray-600 hover:border-cta/40 hover:bg-cream-50"
                        }`}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Date */}
                <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cta text-xs font-bold text-white">2</span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800">Select a date</h2>
                      <p className="text-xs text-gray-500">Highlighted dates have availability blocks. Pick a day to manage its {selectedDuration}-min slots.</p>
                    </div>
                  </div>
                  {(() => {
                    const offerMonth = months[offeredSlotsMonthIndex] ?? null;
                    return offerMonth && calendarGrid(
                      offerMonth,
                      selectedDateForSlots,
                      setSelectedDateForSlots,
                      offeredSlotsMonthIndex,
                      setOfferedSlotsMonthIndex,
                    );
                  })()}
                </div>

                {/* Step 3: Slots */}
                <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cta text-xs font-bold text-white">3</span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800">
                        {selectedDuration}-min slots · {formatDate(selectedDateForSlots)}
                      </h2>
                      <p className="text-xs text-gray-500">Toggle which slots patients can book for this duration</p>
                    </div>
                  </div>

                  {candidateSlots.length > 0 && !slotsLoading && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStartTimes(candidateSlots.map((s) => s.startTime))}
                        className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-cream-100 transition"
                      >
                        Select all ({candidateSlots.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStartTimes([])}
                        className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-cream-100 transition"
                      >
                        Deselect all
                      </button>
                      {selectedStartTimes.length > 0 && (
                        <span className="text-xs text-cta font-medium">
                          {selectedStartTimes.length} of {candidateSlots.length} selected
                        </span>
                      )}
                    </div>
                  )}

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
                      <p className="text-sm font-semibold text-amber-900">No slots to offer on this day</p>
                      <p className="mt-1 text-sm text-amber-700">
                        {datesWithBlocks.has(normalizeDate(selectedDateForSlots))
                          ? `You have blocks on this day but none allow ${selectedDuration}-min appointments. Check "My Availability" to update the block settings.`
                          : "Add an availability block for this day first (e.g. 9:00–12:00), then return here to choose which times to offer."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("blocks");
                          setAddDate(selectedDateForSlots.includes("T") ? selectedDateForSlots.slice(0, 10) : selectedDateForSlots);
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
                      >
                        Add block for {formatDate(selectedDateForSlots)} →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {candidateSlots.map((slot) => {
                        const offered = selectedStartTimes.includes(slot.startTime);
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
                            <span className="text-sm font-semibold">{formatTimeAmPm(selectedDateForSlots, slot.startTime)}</span>
                            <span className="text-[11px] text-gray-400">→ {formatTimeAmPm(selectedDateForSlots, slot.endTime)}</span>
                            {offered && (
                              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-cta">✓ Offered</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {candidateSlots.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-cream-100 pt-5">
                      <button
                        type="button"
                        onClick={saveOfferedSlots}
                        disabled={slotsSaving}
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
                        ) : "Save slots"}
                      </button>
                      {slotsSaveMessage === "saved" && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Saved!
                        </span>
                      )}
                      {slotsSaveMessage === "error" && (
                        <span className="text-sm font-medium text-red-600">Save failed. Try again.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* My Availability tab */
              <>
                <div className="mb-5 inline-flex rounded-xl border border-cream-200 bg-white p-1 shadow-sm">
                  {[
                    { id: "day" as const, label: "Day View" },
                    { id: "all" as const, label: `All Blocks (${blocks.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBlocksTabView(tab.id)}
                      className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                        blocksTabView === tab.id ? "bg-cta text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {blocksTabView === "day" ? (
                  <div className="grid gap-5 lg:grid-cols-[320px_1fr]">

                    {/* Calendar */}
                    <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                      <h2 className="mb-1 text-sm font-semibold text-gray-800">Select a day</h2>
                      <p className="mb-4 text-xs text-gray-500">Highlighted dates have availability blocks.</p>
                      {currentMonth && calendarGrid(
                        currentMonth,
                        selectedDate,
                        setAddDate,
                        safeMonthIndex,
                        setCurrentMonthIndex,
                      )}
                    </div>

                    {/* Right panel */}
                    <div className="space-y-5">
                      {/* Add block */}
                      <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-800">Add block · {formatDate(selectedDate)}</h2>
                        <p className="mt-0.5 text-xs text-gray-500">Set a time range when you're available for appointments.</p>
                        <div className="mt-4 flex flex-wrap items-end gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">From (PST)</label>
                            <input
                              type="time"
                              value={addStart}
                              onChange={(e) => setAddStart(e.target.value)}
                              className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-sm text-navy focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">To (PST)</label>
                            <input
                              type="time"
                              value={addEnd}
                              onChange={(e) => setAddEnd(e.target.value)}
                              className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-sm text-navy focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={addBlock}
                            className="rounded-xl bg-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
                          >
                            + Add block
                          </button>
                        </div>
                      </div>

                      {/* Blocks for selected day */}
                      <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-800">Blocks for {formatDate(selectedDate)}</h2>
                        <p className="mt-0.5 text-xs text-gray-500">Times in Pacific Time (PST)</p>
                        {blocksForSelected.length === 0 ? (
                          <div className="mt-4 rounded-xl border border-dashed border-cream-300 bg-cream-50 p-6 text-center">
                            <p className="text-sm text-gray-400">No blocks for this day yet.</p>
                            <p className="mt-1 text-xs text-gray-400">Use the form above to add one.</p>
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {blocksForSelected.map((b) => blockCard(b))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-800">All availability blocks</h2>
                        <p className="mt-0.5 text-xs text-gray-500">Next {AVAILABILITY_DAYS_AHEAD} days · Pacific Time</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        Filter:
                        <select
                          value={allBlocksFilterDate}
                          onChange={(e) => setAllBlocksFilterDate(e.target.value === "all" ? "all" : normalizeDate(e.target.value))}
                          className="rounded-lg border border-cream-200 bg-cream-50 px-3 py-1.5 text-xs focus:border-cta focus:outline-none"
                        >
                          <option value="all">All dates</option>
                          {uniqueBlockDates.map((d) => (
                            <option key={d} value={d}>{formatDate(d)}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {(allBlocksFilterDate === "all" ? allBlocksSorted : allBlocksSorted.filter((b) => normalizeDate(b.date) === allBlocksFilterDate)).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-cream-300 bg-cream-50 p-8 text-center">
                        <p className="text-sm text-gray-400">No availability blocks saved yet.</p>
                        <p className="mt-1 text-xs text-gray-400">Switch to Day view to add blocks.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(allBlocksFilterDate === "all" ? allBlocksSorted : allBlocksSorted.filter((b) => normalizeDate(b.date) === allBlocksFilterDate))
                          .map((b) => blockCard(b, true))}
                      </div>
                    )}
                  </div>
                )}

                {/* Save bar */}
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-cream-200 bg-white px-6 py-4 shadow-sm">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="btn-primary disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Saving…
                      </span>
                    ) : "Save availability"}
                  </button>
                  <Link href="/doctor" className="btn-secondary">Cancel</Link>
                  {saveMessage === "saved" && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Availability saved!
                    </span>
                  )}
                  {saveMessage === "error" && (
                    <span className="text-sm font-medium text-red-600">Save failed. Please try again.</span>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
