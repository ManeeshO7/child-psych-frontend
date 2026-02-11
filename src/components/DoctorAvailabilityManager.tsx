"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DURATION_OPTIONS = [30, 45, 60] as const;

type Block = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  allowedDurationsMinutes?: number[] | null;
};

// Practice timezone (California) used for storing availability and generating slots
const PRACTICE_TZ = "America/Los_Angeles";

// How many days ahead doctors can configure and patients can see availability.
const AVAILABILITY_DAYS_AHEAD = 60;

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

export default function DoctorAvailabilityManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addDate, setAddDate] = useState(NEXT_DAYS[0]);
  const [addStart, setAddStart] = useState("09:00");
  const [addEnd, setAddEnd] = useState("12:00");
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [saveMessage, setSaveMessage] = useState<"saved" | "error" | null>(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"offer" | "blocks">("offer");
  const [blocksTabView, setBlocksTabView] = useState<"day" | "all">("day");
  const [allBlocksFilterDate, setAllBlocksFilterDate] = useState<string | "all">("all");

  // Offer-slots flow: duration → date → pick slots
  const [selectedDuration, setSelectedDuration] = useState<30 | 45 | 60>(30);
  const [selectedDateForSlots, setSelectedDateForSlots] = useState<string>(NEXT_DAYS[0]);
  const [candidateSlots, setCandidateSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [offeredStartTimes, setOfferedStartTimes] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsSaving, setSlotsSaving] = useState(false);
  const [slotsSaveMessage, setSlotsSaveMessage] = useState<"saved" | "error" | null>(null);
  const [offeredSlotsMonthIndex, setOfferedSlotsMonthIndex] = useState(0);
  const [selectedStartTimes, setSelectedStartTimes] = useState<string[]>([]);

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
      if (candRes.ok) {
        const d = await candRes.json();
        setCandidateSlots(d.slots || []);
      } else {
        setCandidateSlots([]);
      }
      if (offRes.ok) {
        const d = await offRes.json();
        const offered = (d.startTimes || []) as string[];
        setOfferedStartTimes(offered);
        setSelectedStartTimes(offered);
      } else {
        setOfferedStartTimes([]);
        setSelectedStartTimes([]);
      }
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "offer") return;
    loadCandidateAndOfferedSlots();
  }, [activeTab, selectedDateForSlots, selectedDuration]);

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
      setOfferedStartTimes(data.startTimes || []);
      setSelectedStartTimes(data.startTimes || []);
      setSlotsSaveMessage("saved");
      setTimeout(() => setSlotsSaveMessage(null), 3000);
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
      setTimeout(() => setSaveMessage(null), 3000);
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

  const calendarDays: CalendarDay[] = NEXT_DAYS.map((iso) => {
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/doctor" className="text-sm text-warm-brown hover:underline">
          ← Dashboard
        </Link>
      </div>
      <h1 className="section-heading">Manage availability</h1>
      <p className="mt-2 text-gray-600">
        Choose an appointment length (30, 45, or 60 min), pick a date, then select which slots to offer. Only those slots are visible to patients for that appointment type. Set &quot;When I&apos;m available&quot; first so you have slots to offer.
      </p>
      <p className="mt-1 text-sm font-medium text-gray-700">
        All times are in Pacific Time (PST).
      </p>

      {calendarConnected === false && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Connect Google Calendar for meeting links</p>
          <p className="mt-1 text-sm text-amber-700">
            When patients book a slot, a unique Google Meet link is created and emailed to them. Connect your Google account once to enable this.
          </p>
          <a
            href="/api/auth/google"
            className="mt-3 inline-block rounded bg-warm-brown px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Connect Google Calendar
          </a>
        </div>
      )}
      {calendarConnected === true && (
        <p className="mt-4 text-sm text-green-700">Google Calendar connected — each booking gets a new Meet link.</p>
      )}

      {loading ? (
        <p className="mt-8 text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Main tabs: Offer slots | When I'm available */}
          <div className="mt-8 rounded-xl border border-cream-200 bg-white p-1.5 shadow-sm">
            <div className="flex gap-1">
              {[
                { id: "offer" as const, label: "Offer slots" },
                { id: "blocks" as const, label: `When I'm available (${blocks.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "bg-warm-brown text-white"
                      : "bg-transparent text-gray-600 hover:bg-cream-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "offer" ? (
            /* --- Offer slots: duration → date → pick slots --- */
            <div className="mt-6 space-y-6">
              {/* Duration selector (like screenshot 2) */}
              <div className="rounded-lg border border-cream-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-gray-700">Appointment length</h2>
                <p className="mt-1 text-xs text-gray-500">Choose which duration you want to offer slots for.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {([30, 45, 60] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDuration(d)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        selectedDuration === d
                          ? "border-warm-brown bg-warm-brown text-white"
                          : "border-cream-200 bg-white text-gray-700 hover:bg-cream-100"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar: select date */}
              <div className="rounded-lg border border-cream-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-gray-700">Select a date</h2>
                <p className="mt-1 text-xs text-gray-500">Pick a day to choose which {selectedDuration}-min slots to offer.</p>
                {(() => {
                  const offerMonth = months[offeredSlotsMonthIndex] ?? null;
                  return offerMonth && (
                  <>
                    <div className="mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setOfferedSlotsMonthIndex((i) => Math.max(i - 1, 0))}
                        disabled={offeredSlotsMonthIndex === 0}
                        className="rounded-full border border-cream-200 px-2 py-1 text-xs text-gray-600 disabled:opacity-40"
                        aria-label="Previous month"
                      >
                        ‹
                      </button>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {offerMonth.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOfferedSlotsMonthIndex((i) =>
                            Math.min(i + 1, Math.max(months.length - 1, 0))
                          )
                        }
                        disabled={offeredSlotsMonthIndex >= Math.max(months.length - 1, 0)}
                        className="rounded-full border border-cream-200 px-2 py-1 text-xs text-gray-600 disabled:opacity-40"
                        aria-label="Next month"
                      >
                        ›
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1 text-xs">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                        <div key={`${d}-${idx}`} className="flex h-8 w-full min-w-0 items-center justify-center text-gray-500 font-medium">
                          {d}
                        </div>
                      ))}
                      {(() => {
                        const cells: (CalendarDay | null)[] = [];
                        if (offerMonth.days.length > 0) {
                          const firstDow = offerMonth.days[0].dow;
                          for (let i = 0; i < firstDow; i++) cells.push(null);
                          for (const d of offerMonth.days) cells.push(d);
                          while (cells.length % 7 !== 0) cells.push(null);
                        }
                        return cells.map((cell, idx) => {
                          if (!cell) return <div key={`pad-${idx}`} className="h-8 min-w-0" />;
                          const iso = cell.iso;
                          const isSelected = iso === selectedDateForSlots;
                          const isToday = iso === NEXT_DAYS[0];
                          const hasBlocks = datesWithBlocks.has(iso);
                          return (
                            <button
                              key={iso}
                              type="button"
                              onClick={() => setSelectedDateForSlots(iso)}
                              title={hasBlocks ? `${iso}: has availability` : `${iso}: add a block in When I'm available`}
                              className={[
                                "flex h-8 w-full min-w-0 items-center justify-center rounded-full border text-xs font-medium transition",
                                isSelected
                                  ? "border-warm-brown bg-warm-brown text-white"
                                  : hasBlocks
                                    ? "border-warm-brown/40 bg-warm-brown/10 text-warm-brown hover:bg-warm-brown/20"
                                    : "border-cream-200 text-gray-500 hover:bg-cream-100",
                                isToday && !isSelected ? "ring-1 ring-warm-brown/40" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {cell.dom}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </>
                  );
                })()}
              </div>

              {/* Slots for selected date: offer checkboxes */}
              <div className="rounded-lg border border-cream-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-gray-700">
                  {selectedDuration} min slots for {formatDate(selectedDateForSlots)}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Check the slots you want to offer to patients. Only these will be bookable for {selectedDuration}-min appointments.
                </p>
                {selectedStartTimes.length > 0 && !slotsLoading && (
                  <p className="mt-2 text-xs font-medium text-warm-brown">
                    Offered for this day: {selectedStartTimes.map((t) => formatTimeAmPm(selectedDateForSlots, t)).join(", ")}
                  </p>
                )}
                {slotsLoading ? (
                  <p className="mt-4 text-sm text-gray-500">Loading slots…</p>
                ) : candidateSlots.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-900">
                      No slots to offer on this day.
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      {datesWithBlocks.has(normalizeDate(selectedDateForSlots))
                        ? <>You have availability blocks on this day, but none allow this duration, or times are already booked. In &quot;When I&apos;m available&quot; ensure the block allows {selectedDuration} min for that day.</>
                        : "Add an availability block for this day first (e.g. 9:00–12:00), then return here to choose which times to offer."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("blocks");
                        setAddDate(selectedDateForSlots.includes("T") ? selectedDateForSlots.slice(0, 10) : selectedDateForSlots);
                      }}
                      className="mt-3 rounded bg-warm-brown px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                    >
                      When I&apos;m available → add block for {formatDate(selectedDateForSlots)}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {candidateSlots.map((slot) => {
                      const offered = selectedStartTimes.includes(slot.startTime);
                      return (
                        <label
                          key={slot.startTime}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                            offered
                              ? "border-warm-brown bg-warm-brown/10 text-warm-brown"
                              : "border-cream-200 bg-white text-gray-700 hover:bg-cream-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={offered}
                            onChange={() => toggleSlotOffered(slot.startTime)}
                            className="rounded border-cream-300"
                          />
                          <span>
                            {formatTimeAmPm(selectedDateForSlots, slot.startTime)} –{" "}
                            {formatTimeAmPm(selectedDateForSlots, slot.endTime)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {candidateSlots.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={saveOfferedSlots}
                      disabled={slotsSaving}
                      className="btn-primary"
                    >
                      {slotsSaving ? "Saving…" : "Save slots"}
                    </button>
                    {slotsSaveMessage === "saved" && (
                      <span className="text-sm font-medium text-green-700">Saved!</span>
                    )}
                    {slotsSaveMessage === "error" && (
                      <span className="text-sm font-medium text-red-700">Save failed.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* --- When I'm available: blocks --- */
            <>
              <div className="mt-6 rounded-xl border border-cream-200 bg-white p-1.5">
                <div className="flex gap-1">
                  {[
                    { id: "day" as const, label: "Day view" },
                    { id: "all" as const, label: `All blocks (${blocks.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBlocksTabView(tab.id)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        blocksTabView === tab.id
                          ? "bg-warm-brown text-white"
                          : "bg-transparent text-gray-600 hover:bg-cream-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {blocksTabView === "day" ? (
              <>
              <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                {/* Calendar (60-day window) */}
                <div className="rounded-lg border border-cream-200 bg-white p-4">
                  <h2 className="text-sm font-semibold text-gray-700">Select a day</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Days with availability are highlighted. Click a date to edit its blocks.
                  </p>
                  {currentMonth && (
                    <>
                      {/* Month header with navigation */}
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setCurrentMonthIndex((i) => Math.max(i - 1, 0))}
                          disabled={safeMonthIndex === 0}
                          className="rounded-full border border-cream-200 px-2 py-1 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Previous month"
                        >
                          ‹
                        </button>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {currentMonth.label}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentMonthIndex((i) => Math.min(i + 1, Math.max(months.length - 1, 0)))
                          }
                          disabled={safeMonthIndex === Math.max(months.length - 1, 0)}
                          className="rounded-full border border-cream-200 px-2 py-1 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Next month"
                        >
                          ›
                        </button>
                      </div>

                      {/* Day-of-week header */}
                      <div className="mt-2 grid grid-cols-7 gap-1 text-xs font-medium text-gray-500">
                        {dayLabels.map((d, idx) => (
                          <div key={`${d}-${idx}`} className="flex h-8 min-w-0 w-full items-center justify-center">
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Days grid */}
                      <div className="mt-1 grid grid-cols-7 gap-1 text-xs">
                        {(() => {
                          const cells: (CalendarDay | null)[] = [];
                          if (currentMonth.days.length > 0) {
                            const firstDow = currentMonth.days[0].dow;
                            for (let i = 0; i < firstDow; i++) {
                              cells.push(null);
                            }
                            for (const d of currentMonth.days) {
                              cells.push(d);
                            }
                            while (cells.length % 7 !== 0) {
                              cells.push(null);
                            }
                          }
                          return cells.map((cell, idx) => {
                            if (!cell) {
                              return <div key={idx} className="h-8 min-w-0" />;
                            }
                            const iso = cell.iso;
                            const isSelected = iso === selectedDate;
                            const hasBlocks = datesWithBlocks.has(iso);
                            const isToday = iso === NEXT_DAYS[0];
                            return (
                              <button
                                key={iso}
                                type="button"
                                onClick={() => setAddDate(iso)}
                                className={[
                                  "flex h-8 w-full min-w-0 items-center justify-center rounded-full border text-xs font-medium transition",
                                  isSelected
                                    ? "border-warm-brown bg-warm-brown text-white shadow-sm"
                                    : hasBlocks
                                      ? "border-warm-brown/40 bg-warm-brown/10 text-warm-brown"
                                      : "border-transparent text-gray-700 hover:border-cream-300 hover:bg-cream-100",
                                  isToday && !isSelected ? "ring-1 ring-warm-brown/40" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {cell.dom}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </>
                  )}
                </div>

                {/* Day editor */}
                <div className="rounded-lg border border-cream-200 bg-white p-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Add block for {formatDate(selectedDate)}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a start and end time to add a new availability block for this day.
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs text-gray-500">From (PST)</label>
                      <input
                        type="time"
                        value={addStart}
                        onChange={(e) => setAddStart(e.target.value)}
                        className="mt-0.5 rounded border border-cream-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">To (PST)</label>
                      <input
                        type="time"
                        value={addEnd}
                        onChange={(e) => setAddEnd(e.target.value)}
                        className="mt-0.5 rounded border border-cream-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addBlock}
                      className="rounded bg-warm-brown px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                    >
                      Add block
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-semibold text-gray-700">
                  Blocks for {formatDate(selectedDate)}
                </h2>
                <p className="mt-1 text-xs text-gray-500">Times are in Pacific Time (PST).</p>
                {blocksForSelected.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No blocks for this day yet. Use the form above to add one, then click Save.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3 list-none p-0">
                    {blocksForSelected.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cream-200 bg-white shadow-sm px-4 py-3 text-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-gray-800">
                            {formatTimeAmPm(b.date, b.startTime)} – {formatTimeAmPm(b.date, b.endTime)}
                          </span>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                            <span className="text-gray-500">Allow:</span>
                            {DURATION_OPTIONS.map((dur) => {
                              const allowed = getAllowedForBlock(b);
                              const checked = allowed.includes(dur);
                              return (
                                <label key={dur} className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked
                                        ? allowed.filter((x) => x !== dur)
                                        : [...allowed, dur].sort((a, b) => a - b);
                                      setAllowedForBlock(b.id, next.length ? next : [...DURATION_OPTIONS]);
                                    }}
                                    className="rounded border-cream-300"
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
                          className="text-red-600 hover:underline text-sm shrink-0 ml-2"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
              ) : (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-700">
                All blocks (next {AVAILABILITY_DAYS_AHEAD} days)
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Times are in Pacific Time (PST). Use the filter to focus on a specific day.
              </p>
              <p className="mt-1 text-xs text-gray-600">
                These blocks define when you&apos;re free. The specific 30/45/60 min slots that patients can book are set in the <strong>Offer slots</strong> tab.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-xs text-gray-600">
                  Filter by date:&nbsp;
                  <select
                    value={allBlocksFilterDate}
                    onChange={(e) =>
                      setAllBlocksFilterDate(
                        e.target.value === "all" ? "all" : normalizeDate(e.target.value),
                      )
                    }
                    className="mt-0.5 rounded border border-cream-200 px-2 py-1.5 text-xs"
                  >
                    <option value="all">All dates</option>
                    {uniqueBlockDates.map((d) => (
                      <option key={d} value={d}>
                        {formatDate(d)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {(
                allBlocksFilterDate === "all"
                  ? allBlocksSorted
                  : allBlocksSorted.filter((b) => normalizeDate(b.date) === allBlocksFilterDate)
              ).length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  No availability blocks saved yet. Use the Day view to add blocks, then click Save.
                </p>
              ) : (
                <ul className="mt-3 space-y-3 list-none p-0">
                  {(allBlocksFilterDate === "all"
                    ? allBlocksSorted
                    : allBlocksSorted.filter((b) => normalizeDate(b.date) === allBlocksFilterDate)
                  ).map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cream-200 bg-white shadow-sm px-4 py-3 text-sm"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-gray-800">
                          {formatDate(b.date)}
                        </span>
                        <span className="text-gray-600">
                          {formatTimeAmPm(b.date, b.startTime)} – {formatTimeAmPm(b.date, b.endTime)}
                        </span>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          <span className="text-gray-500">Allow:</span>
                          {DURATION_OPTIONS.map((dur) => {
                            const allowed = getAllowedForBlock(b);
                            const checked = allowed.includes(dur);
                            return (
                              <label key={dur} className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const next = checked
                                      ? allowed.filter((x) => x !== dur)
                                      : [...allowed, dur].sort((a, b) => a - b);
                                    setAllowedForBlock(b.id, next.length ? next : [...DURATION_OPTIONS]);
                                  }}
                                  className="rounded border-cream-300"
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
                        className="text-red-600 hover:underline text-sm shrink-0 ml-2"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
              )}
            </>
          )}

          {activeTab === "blocks" && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving…" : "Save availability"}
            </button>
            <Link href="/doctor" className="btn-secondary">
              Cancel
            </Link>
            {saveMessage === "saved" && (
              <span className="text-sm font-medium text-green-700">Saved!</span>
            )}
            {saveMessage === "error" && (
              <span className="text-sm font-medium text-red-700">Save failed. See alert.</span>
            )}
          </div>
          )}
        </>
      )}
    </main>
  );
}
