"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Block = { id: string; date: string; startTime: string; endTime: string };

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
  const [activeTab, setActiveTab] = useState<"day" | "all">("day");
  const [allBlocksFilterDate, setAllBlocksFilterDate] = useState<string | "all">("all");

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

  // Convert a local (doctor browser) time to practice time ("HH:MM" in America/Los_Angeles)
  function toPracticeTime(dateStr: string, localTime: string): string {
    const dateOnly = dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
    const [h, m] = localTime.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return localTime;
    // Local datetime in the doctor's timezone
    const local = new Date(`${dateOnly}T00:00:00`);
    local.setHours(h, m ?? 0, 0, 0);
    // Represent that instant in the practice timezone and extract HH:MM (24h)
    const practiceStr = local.toLocaleTimeString("en-US", {
      timeZone: PRACTICE_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [ph, pm] = practiceStr.split(":");
    return `${ph}:${pm}`;
  }

  function addBlock() {
    if (addStart >= addEnd) {
      alert("Start time must be before end time.");
      return;
    }
    // Store times in practice timezone so backend stays consistent,
    // but we'll display them back in the doctor's local timezone below.
    const practiceStart = toPracticeTime(addDate, addStart);
    const practiceEnd = toPracticeTime(addDate, addEnd);
    setBlocks((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, date: addDate, startTime: practiceStart, endTime: practiceEnd },
    ]);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  async function save() {
    const payload = blocks.map((b) => ({
      date: b.date.includes("T") ? b.date.slice(0, 10) : b.date,
      startTime: b.startTime,
      endTime: b.endTime,
    }));
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

  // Convert time stored in practice timezone to doctor's local timezone for display.
  const formatTimeAmPm = (dateStr: string, time: string) => {
    const dateOnly = dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return time;

    // Step 1: Create a reference UTC date (noon UTC on the target date)
    const utcNoon = new Date(`${dateOnly}T12:00:00Z`);

    // Step 2: Figure out what time noon UTC is in the practice timezone
    const practiceNoonStr = utcNoon.toLocaleString("en-US", {
      timeZone: PRACTICE_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [practiceNoonH] = practiceNoonStr.split(":").map(Number);

    // Step 3: Calculate offset between UTC noon and practice noon (in hours)
    const offsetHours = 12 - practiceNoonH;

    // Step 4: Build a UTC date that corresponds to the given practice time
    const utcDate = new Date(
      `${dateOnly}T${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}:00Z`,
    );
    utcDate.setUTCHours(utcDate.getUTCHours() + offsetHours);

    // Step 5: Format in the doctor's local (browser) timezone
    return utcDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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
        Set your available blocks for the next {AVAILABILITY_DAYS_AHEAD} days. Patients will see 30-minute slots within these blocks.
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
          {/* View toggle */}
          <div className="mt-8 rounded-xl border border-cream-200 bg-white p-1.5 shadow-sm">
            <div className="flex gap-1">
              {[
                { id: "day" as const, label: "Day view" },
                { id: "all" as const, label: `All blocks (${blocks.length})` },
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

          {activeTab === "day" ? (
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
                      <div className="mt-2 text-xs font-medium text-gray-500 grid grid-cols-7 gap-1">
                        {dayLabels.map((d, idx) => (
                          <div key={`${d}-${idx}`} className="flex h-6 items-center justify-center">
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
                              return <div key={idx} className="h-8" />;
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
                                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition",
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
                      <label className="block text-xs text-gray-500">From</label>
                      <input
                        type="time"
                        value={addStart}
                        onChange={(e) => setAddStart(e.target.value)}
                        className="mt-0.5 rounded border border-cream-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">To</label>
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
                <p className="mt-1 text-xs text-gray-500">Times are shown in your browser's timezone.</p>
                {blocksForSelected.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No blocks for this day yet. Use the form above to add one, then click Save.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3 list-none p-0">
                    {blocksForSelected.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between rounded-lg border border-cream-200 bg-white shadow-sm px-4 py-3 text-sm"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-800">
                            {formatTimeAmPm(b.date, b.startTime)} – {formatTimeAmPm(b.date, b.endTime)}
                          </span>
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
                Times are shown in your browser's timezone. Use the filter to focus on a specific day.
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
                      className="flex items-center justify-between rounded-lg border border-cream-200 bg-white shadow-sm px-4 py-3 text-sm"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-800">
                          {formatDate(b.date)}
                        </span>
                        <span className="text-gray-600">
                          {formatTimeAmPm(b.date, b.startTime)} – {formatTimeAmPm(b.date, b.endTime)}
                        </span>
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
        </>
      )}
    </main>
  );
}
