"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

type Slot = { start: string; end: string };

const PRACTICE_TZ = "America/Los_Angeles";
const MAX_SLOTS_TO_RENDER = 2000;

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

type ScheduleFollowupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  allowedTypes?: string[]; // ["followup_med_30", "followup_med_therapy_45"]
  onSuccess?: () => void;
};

export default function ScheduleFollowupModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  allowedTypes = ["followup_med_30", "followup_med_therapy_45"],
  onSuccess,
}: ScheduleFollowupModalProps) {
  const effectiveTypes = useMemo(
    () => (allowedTypes?.length ? allowedTypes : ["followup_med_30", "followup_med_therapy_45"]),
    [allowedTypes]
  );
  const [type, setType] = useState(() => effectiveTypes[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requireFormsBeforeConfirm, setRequireFormsBeforeConfirm] = useState(true);
  const prevOpenRef = useRef(false);

  const durationMinutes = type === "followup_med_therapy_45" ? 45 : 30;

  useEffect(() => {
    if (isOpen && !prevOpenRef.current && effectiveTypes.length > 0) {
      setType(effectiveTypes[0]);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, effectiveTypes]);

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const controller = new AbortController();
    setSlotsLoading(true);
    setSelectedDate(null);
    setSelectedSlot(null);
    setCurrentMonthIndex(0);
    setError(null);
    // Defer slot fetch so overlay paints first and main thread stays responsive (avoids Chrome hang/crash)
    let raf2Id: number | undefined;
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      raf2Id = requestAnimationFrame(() => {
        if (cancelled) return;
        async function loadSlots() {
          try {
            const res = await fetch(
              `/api/availability/slots?durationMinutes=${durationMinutes}`,
              { credentials: "include", signal: controller.signal }
            );
            if (cancelled) return;
            if (res.ok) {
              const data = await res.json();
              if (!cancelled) {
                const incoming = Array.isArray(data?.slots) ? data.slots : [];
                // Guard the calendar UI against unusually large payloads that can freeze the tab.
                setSlots(incoming.slice(0, MAX_SLOTS_TO_RENDER));
              }
            } else if (!cancelled) {
              setSlots([]);
            }
          } catch {
            if (!cancelled) setSlots([]);
          } finally {
            if (!cancelled) setSlotsLoading(false);
          }
        }
        loadSlots();
      });
    });
    return () => {
      cancelled = true;
      controller.abort();
      cancelAnimationFrame(rafId);
      if (typeof raf2Id === "number") cancelAnimationFrame(raf2Id);
    };
  }, [isOpen, durationMinutes]);

  const { byDate, sortedDates, months } = useMemo(() => {
    const by: Record<string, Slot[]> = {};
    for (const slot of slots) {
      const key = slot.start.slice(0, 10);
      if (!by[key]) by[key] = [];
      by[key].push(slot);
    }
    const sorted = Object.keys(by).sort();
    const monthMap = new Map<string, string[]>();
    for (const d of sorted) {
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

  async function handleSchedule() {
    if (!selectedSlot) {
      setError("Please select a time slot.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/schedule-for-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          scheduledAt: selectedSlot.start,
          durationMinutes,
          type,
          requireFormsBeforeConfirm,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to schedule");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  }

  const typeLabel = type === "followup_med_therapy_45" ? "45 min – Med + therapy" : "30 min – Med management";

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="schedule-followup-title">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl overscroll-contain">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 id="schedule-followup-title" className="text-xl font-semibold text-navy">Schedule follow-up</h2>
          <p className="mt-1 text-sm text-gray-600">
            Schedule a follow-up for {patientName || "patient"}. They will be asked to add their card and confirm.
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Follow-up type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setSelectedDate(null);
                setSelectedSlot(null);
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {effectiveTypes.includes("followup_med_30") && (
                <option value="followup_med_30">30 min – Med management</option>
              )}
              {effectiveTypes.includes("followup_med_therapy_45") && (
                <option value="followup_med_therapy_45">45 min – Med + therapy</option>
              )}
            </select>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={requireFormsBeforeConfirm}
              onChange={(e) => setRequireFormsBeforeConfirm(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-cta focus:ring-cta"
            />
            <span className="text-sm text-gray-700">
              Require assigned forms to be completed before the patient can confirm this appointment
            </span>
          </label>

          <p className="text-sm text-gray-500">
            Times are shown in Pacific Time (America/Los_Angeles).
          </p>

          {slotsLoading ? (
            <p className="text-gray-500">Loading available slots…</p>
          ) : sortedDates.length === 0 ? (
            <div className="rounded-lg border border-cream-200 bg-cream-50 p-4 text-center">
              <p className="text-gray-600">No available {durationMinutes}-min slots in the next 3 months.</p>
              <p className="mt-1 text-sm text-gray-500">Add availability and offer {durationMinutes}-min slots in your calendar.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-cream-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-navy">1. Pick a date</h3>
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
                <div className="rounded-xl border border-cream-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-navy">2. Select a time slot</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatSlotDate(slotsForSelected[0]?.start ?? selectedDate)} · {typeLabel}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {slotsForSelected.map((slot, index) => {
                      const isSelected = selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={`${slot.start}-${slot.end}-${index}`}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          disabled={submitting}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
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
            </>
          )}
        </div>
        {error && <div className="px-6 pb-2 text-sm text-red-600">{error}</div>}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSchedule}
            disabled={submitting || !selectedSlot}
            className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
          >
            {submitting ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return createPortal(modalContent, document.body);
}
