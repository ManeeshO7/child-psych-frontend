"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AssignFormsModal from "@/components/AssignFormsModal";
import SetAllowedFollowupModal from "@/components/SetAllowedFollowupModal";
import ScheduleFollowupModal from "@/components/ScheduleFollowupModal";
import ScheduleClinicalIntakeModal from "@/components/ScheduleClinicalIntakeModal";
import RescheduleModal from "@/components/RescheduleModal";
import ConfirmChargeModal from "@/components/ConfirmChargeModal";

const RESCHEDULABLE_STATUSES = ["scheduled", "card_on_file", "paid"];

function canReschedule(a: { scheduledAt: string; status: string }): boolean {
  return RESCHEDULABLE_STATUSES.includes(a.status);
}

type Appointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  type: string;
  notes: string | null;
  meetLink?: string | null;
  patient?: { id: string; email: string; name: string };
  /** Present for orientation_consult: true when patient already has form assignments */
  patientHasAssignedForms?: boolean;
  /** Present for orientation_consult: true when patient already has a clinical intake (pending/scheduled/paid) */
  patientHasPendingClinicalIntake?: boolean;
  /** Present for completed clinical_intake/intake: true when patient already has a follow-up scheduled */
  patientHasScheduledFollowup?: boolean;
  /** Present for clinical_intake/followup: true when forms are already assigned for this appointment */
  hasFormsForThisAppointment?: boolean;
  /** Number of forms assigned to this appointment (clinical_intake / followup) */
  formsAssignedCount?: number;
  /** If false, doctor marked "no forms required" for this appointment */
  requireFormsBeforeConfirm?: boolean;
  /** ISO timestamp of when payment was collected */
  chargedAt?: string | null;
  /** Amount charged in cents */
  amountCents?: number | null;
};

type FormattedAppointment = {
  appointment: Appointment;
  formattedDate: string;
};

export default function DoctorAppointmentsList() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [prevStack, setPrevStack] = useState<(string | null)[]>([]);
  const [view, setView] = useState<"active" | "completed">("active");
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [loading, setLoading] = useState(true);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openingMeetId, setOpeningMeetId] = useState<string | null>(null);
  const [openingChargeModalId, setOpeningChargeModalId] = useState<string | null>(null);
  const [assignFormsModalOpen, setAssignFormsModalOpen] = useState(false);
  const [assignFormsAppointment, setAssignFormsAppointment] = useState<{ id: string; patientId: string } | null>(null);
  const [setFollowupModalOpen, setSetFollowupModalOpen] = useState(false);
  const [setFollowupPatient, setSetFollowupPatient] = useState<{ patientId: string; patientName: string } | null>(null);
  const [scheduleFollowupOpen, setScheduleFollowupOpen] = useState(false);
  const [scheduleFollowupPatient, setScheduleFollowupPatient] = useState<{
    patientId: string;
    patientName: string;
    allowedTypes: string[];
  } | null>(null);
  const [openingFollowupForPatientId, setOpeningFollowupForPatientId] = useState<string | null>(null);
  const [scheduleClinicalIntakeOpen, setScheduleClinicalIntakeOpen] = useState(false);
  const [scheduleClinicalIntakeAppointment, setScheduleClinicalIntakeAppointment] = useState<{
    id: string;
    patientId: string;
    patientName: string;
  } | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [chargeConfirmAppointment, setChargeConfirmAppointment] = useState<Appointment | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [tzLabel, setTzLabel] = useState("PT");
  const loadingRef = useRef(false);
  const mountedRef = useRef(true); // Track if component is mounted
  const activeLoadControllerRef = useRef<AbortController | null>(null);
  const latestLoadRequestIdRef = useRef(0);

  const noticeTimeoutRef = useRef<number | null>(null);
  const openingMeetTimeoutRef = useRef<number | null>(null);
  const openingChargeModalTimeoutRef = useRef<number | null>(null);

  function showNotice(type: "success" | "error" | "info", message: string) {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    setNotice({ type, message });
    noticeTimeoutRef.current = window.setTimeout(() => {
      setNotice((curr) => (curr?.message === message ? null : curr));
      noticeTimeoutRef.current = null;
    }, 4000);
  }


  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
      if (openingMeetTimeoutRef.current) clearTimeout(openingMeetTimeoutRef.current);
      if (openingChargeModalTimeoutRef.current) clearTimeout(openingChargeModalTimeoutRef.current);
    };
  }, []);

  // Cache timezone label to avoid recalculating in render loop
  useEffect(() => {
    try {
      const d = new Date();
      const tzName = d.toLocaleTimeString("en-US", {
        timeZone: "America/Los_Angeles",
        timeZoneName: "short",
      });
      const match = tzName.match(/\s([A-Z]{3,4})$/);
      setTzLabel(match ? match[1] : "PT");
    } catch {
      setTzLabel("PT");
    }
  }, []);

  async function load(
    cursor: string | null,
    nextView?: "active" | "completed",
    patientSearch?: string,
  ) {
    if (!mountedRef.current) {
      return;
    }
    // Cancel any in-flight load so stale responses cannot overwrite current tab state.
    if (activeLoadControllerRef.current) {
      activeLoadControllerRef.current.abort();
    }
    const requestId = latestLoadRequestIdRef.current + 1;
    latestLoadRequestIdRef.current = requestId;
    const controller = new AbortController();
    activeLoadControllerRef.current = controller;
    loadingRef.current = true;
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "10");
      qs.set("view", nextView ?? view);
      if (cursor) qs.set("cursor", cursor);
      if (filterDate) qs.set("date_str", filterDate);
      if (patientSearch?.trim()) qs.set("patient_search", patientSearch.trim());
      const res = await fetch(`/api/appointments/paged?${qs.toString()}`, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!mountedRef.current || requestId !== latestLoadRequestIdRef.current) return;
      
      if (res.status === 401) {
        router.push("/doctor/login");
        if (mountedRef.current) setLoading(false);
        return;
      }
      if (!res.ok) {
        console.error("Failed to load appointments:", res.status);
        if (mountedRef.current) {
          setAppointments([]);
          setNextCursor(null);
          setHasMore(false);
          setLoading(false);
        }
        return;
      }
      const data = await res.json();
      if (mountedRef.current && requestId === latestLoadRequestIdRef.current) {
        const items = Array.isArray(data?.items) ? data.items : [];
        // Validate + dedupe items defensively. Duplicate/malformed IDs can cause unstable React reconciliation.
        const validAppointments = items.filter(
          (a: unknown) =>
            a &&
            typeof a === "object" &&
            typeof (a as { id?: unknown }).id === "string" &&
            (a as { id: string }).id.trim().length > 0,
        ) as Appointment[];
        const seenIds = new Set<string>();
        const dedupedAppointments: Appointment[] = [];
        for (const apt of validAppointments) {
          if (seenIds.has(apt.id)) continue;
          seenIds.add(apt.id);
          dedupedAppointments.push(apt);
        }
        setAppointments(dedupedAppointments);
        setNextCursor(typeof data?.nextCursor === "string" ? data.nextCursor : null);
        setHasMore(Boolean(data?.hasMore));
        setLoading(false);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("Error loading appointments:", err);
      if (mountedRef.current) {
        setAppointments([]);
        setNextCursor(null);
        setHasMore(false);
        setLoading(false);
      }
    } finally {
      if (requestId === latestLoadRequestIdRef.current) {
        loadingRef.current = false;
      }
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setSearchApplied(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadingRef.current = false;
      if (activeLoadControllerRef.current) {
        activeLoadControllerRef.current.abort();
      }
    };
  }, []);

  // When switching tabs, date filter, or patient search, reset pagination and reload.
  useEffect(() => {
    setLoading(true);
    setPageCursor(null);
    setPrevStack([]);
    setNextCursor(null);
    setHasMore(false);
    load(null, view, searchApplied).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filterDate, searchApplied]);

  const formattedAppointments: FormattedAppointment[] = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    return appointments.map((appointment) => {
      let formattedDate = "Date TBD";
      try {
        if (appointment.scheduledAt) {
          const date = new Date(appointment.scheduledAt);
          if (!isNaN(date.getTime())) {
            formattedDate =
              date.toLocaleString("en-US", {
                timeZone: "America/Los_Angeles",
                dateStyle: "medium",
                timeStyle: "short",
                hour12: true,
              }) + ` ${tzLabel}`;
          }
        }
      } catch {
        formattedDate = "Date error";
      }
      return { appointment, formattedDate };
    });
  }, [appointments, tzLabel]);

  // Latest completed appointment that can have "Schedule follow-up" (list is date desc, so first match)
  const FOLLOWUP_ELIGIBLE_TYPES = ["clinical_intake", "intake", "followup_med_30", "followup_med_therapy_45"];
  const latestScheduleFollowupId = useMemo(() => {
    const found = formattedAppointments.find(
      ({ appointment }) =>
        appointment.status === "completed" && FOLLOWUP_ELIGIBLE_TYPES.includes(appointment.type),
    );
    return found?.appointment.id ?? null;
  }, [formattedAppointments]);

  async function goNext() {
    if (!nextCursor) return;
    // Save current cursor so we can go back
    setPrevStack((prev) => [...prev, pageCursor]);
    setPageCursor(nextCursor);
    setLoading(true);
    await load(nextCursor, undefined, searchApplied);
  }

  async function goPrev() {
    if (prevStack.length === 0) return;
    const prevCursor = prevStack[prevStack.length - 1] ?? null;
    setPrevStack((prev) => prev.slice(0, -1));
    setPageCursor(prevCursor);
    setLoading(true);
    await load(prevCursor, undefined, searchApplied);
  }

  function openChargeModal(appointment: Appointment) {
    if (openingChargeModalId === appointment.id || chargeConfirmAppointment?.id === appointment.id) {
      return;
    }
    if (openingChargeModalTimeoutRef.current) clearTimeout(openingChargeModalTimeoutRef.current);
    setOpeningChargeModalId(appointment.id);
    setChargeConfirmAppointment(appointment);
    openingChargeModalTimeoutRef.current = window.setTimeout(() => {
      setOpeningChargeModalId((curr) => (curr === appointment.id ? null : curr));
      openingChargeModalTimeoutRef.current = null;
    }, 800);
  }

  async function completeAppointment(id: string) {
    if (completingId !== null) {
      return; // Prevent multiple simultaneous completions
    }
    setCompletingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        setCompletingId(null);
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showNotice("error", err.detail || "Failed to mark as completed");
        setCompletingId(null);
        return;
      }
      const result = await res.json().catch(() => ({}));
      if (result.ok && result.message) {
        showNotice("success", result.message);
      }
      // Longer delay before reloading to prevent rapid state updates
      await new Promise(resolve => setTimeout(resolve, 800));
      // Only reload if still mounted and not already loading
      if (mountedRef.current && !loadingRef.current) {
        await load(pageCursor);
      }
    } catch (err) {
      console.error("Complete error:", err);
      if (mountedRef.current) {
        showNotice("error", "Network error while marking as completed. Please try again.");
      }
    } finally {
      if (mountedRef.current) {
        setCompletingId(null);
      }
    }
  }

  async function rejectAfterOrientation(appointmentId: string) {
    if (rejectingId !== null) return;
    if (!confirm("Reject this patient? They will no longer see the option to book clinical intake.")) return;
    setRejectingId(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reject-after-orientation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showNotice("error", err.detail || "Failed to reject");
        return;
      }
      showNotice("success", "Patient will no longer see clinical intake option.");
      await load(pageCursor);
    } catch {
      showNotice("error", "Network error. Please try again.");
    } finally {
      setRejectingId(null);
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    orientation_consult: "Orientation Consult",
    clinical_intake: "Clinical Intake",
    followup_med_30: "Follow-up · Med (30 min)",
    followup_med_therapy_45: "Follow-up · Med + Therapy (45 min)",
    intake: "Intake",
  };

  const STATUS_STYLES: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    pending_confirmation: "bg-orange-100 text-orange-800",
    card_on_file: "bg-amber-100 text-amber-800",
    paid: "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-500",
  };

  const STATUS_LABELS: Record<string, string> = {
    scheduled: "Scheduled",
    pending_confirmation: "Pending Confirmation",
    card_on_file: "Card on File",
    paid: "Paid",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div className="min-h-screen bg-cream-50/60">
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

      {/* Toast notice */}
      {notice && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`flex w-full max-w-xl items-start justify-between gap-3 rounded-2xl border px-5 py-3.5 shadow-lg ${
              notice.type === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-cream-200 bg-white text-navy"
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium">{notice.message}</p>
            <button type="button" onClick={() => setNotice(null)} className="text-sm opacity-60 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      {/* Page header */}
      <Link href="/doctor" className="inline-flex items-center gap-1 text-sm text-cta hover:underline mb-6">
        ← Back to dashboard
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy">Appointments</h1>
            <p className="text-sm text-gray-500">
              {appointments.length > 0 ? `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""}` : "Upcoming and past appointments"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            id="appt-patient-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by patient name…"
            className="w-full rounded-xl border border-cream-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy placeholder-gray-400 shadow-sm focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
            aria-label="Search by patient name"
          />
        </div>
      </div>

      {/* Filters row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Tab toggle */}
        <div className="rounded-xl border border-cream-200 bg-white p-1.5 shadow-sm flex gap-1">
          {(["active", "completed"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === v ? "bg-cta text-white shadow-sm" : "text-gray-500 hover:text-navy"
              }`}
            >
              {v === "active" ? "Active" : "Completed"}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="appt-date-filter" className="text-sm text-gray-500 whitespace-nowrap">Filter by date:</label>
          <input
            id="appt-date-filter"
            type="date"
            value={filterDate ?? ""}
            onChange={(e) => setFilterDate(e.target.value || null)}
            className="rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-navy shadow-sm focus:border-cta focus:outline-none"
          />
          {filterDate && (
            <button type="button" onClick={() => setFilterDate(null)} className="text-sm text-cta hover:underline">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div key={`appointments-${view}-${pageCursor ?? "root"}-${filterDate ?? "all"}-${searchApplied || "none"}`}>
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-7 w-7 animate-spin text-cta" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-gray-500">Loading appointments…</p>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-300 bg-white py-20 text-center">
            <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="mt-3 text-sm font-medium text-gray-500">
              {searchApplied
                ? `No appointments found for "${searchApplied}"`
                : filterDate
                  ? `No appointments on ${new Date(filterDate + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
                  : "No appointments yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-3">
              {formattedAppointments.map(({ appointment: a, formattedDate }, idx) => (
              <li
                key={`${a.id}-${a.status}-${a.type}-${a.scheduledAt ?? "na"}-${idx}`}
                className="rounded-2xl border border-cream-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Status strip */}
                <div className={`h-1 w-full ${
                  a.status === "scheduled" ? "bg-blue-400" :
                  a.status === "pending_confirmation" ? "bg-orange-400" :
                  a.status === "card_on_file" ? "bg-amber-400" :
                  a.status === "paid" ? "bg-indigo-400" :
                  a.status === "completed" ? "bg-green-400" :
                  "bg-gray-200"
                }`} />

                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Patient + date */}
                      <div className="flex items-center gap-3">
                        {a.patient?.name && (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cta/10 text-sm font-semibold text-cta">
                            {a.patient.name[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-navy">{a.patient?.name ?? "Patient"}</p>
                          <p className="text-xs text-gray-500">{formattedDate}</p>
                        </div>
                      </div>

                      {/* Type + duration */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-cream-100 px-2.5 py-1 text-xs font-medium text-navy">
                          {TYPE_LABELS[a.type] ?? a.type}
                        </span>
                        <span className="text-xs text-gray-400">{a.durationMinutes} min</span>
                      </div>

                      {/* Payment info */}
                      {(a.status === "paid" || a.status === "completed") && a.chargedAt && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-2.5 py-1">
                          <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-medium text-green-800">
                            Payment collected
                            {a.amountCents ? ` · $${(a.amountCents / 100).toFixed(2)}` : ""}
                            {" · "}
                            {new Date(a.chargedAt).toLocaleString("en-US", {
                              timeZone: "America/Los_Angeles",
                              month: "short", day: "numeric", year: "numeric",
                              hour: "numeric", minute: "2-digit", hour12: true,
                            })}
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {a.meetLink && (a.status === "scheduled" || a.status === "card_on_file" || a.status === "paid") && (
                          <a
                            href={a.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (openingMeetId === a.id) { e.preventDefault(); e.stopPropagation(); return; }
                              if (openingMeetTimeoutRef.current) clearTimeout(openingMeetTimeoutRef.current);
                              setOpeningMeetId(a.id);
                              openingMeetTimeoutRef.current = window.setTimeout(() => {
                                setOpeningMeetId((curr) => (curr === a.id ? null : curr));
                                openingMeetTimeoutRef.current = null;
                              }, 2000);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-cta/40 bg-cta/5 px-3 py-1.5 text-xs font-semibold text-cta hover:bg-cta/10"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                            {openingMeetId === a.id ? "Opening…" : "Join video call"}
                          </a>
                        )}
                        {a.status === "pending_confirmation" && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setRescheduleAppointment(a); }}
                            className="inline-flex items-center rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-cta/30 hover:text-cta">
                            Change time
                          </button>
                        )}
                        {canReschedule(a) && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setRescheduleAppointment(a); }}
                            className="inline-flex items-center rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-cta/30 hover:text-cta">
                            Reschedule
                          </button>
                        )}
                        {a.status === "card_on_file" && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); openChargeModal(a); }}
                            disabled={openingChargeModalId === a.id}
                            className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                            {openingChargeModalId === a.id ? "Opening…" : "Charge now"}
                          </button>
                        )}
                        {a.status === "paid" && (
                          <button type="button" onClick={() => completeAppointment(a.id)} disabled={completingId !== null}
                            className="inline-flex items-center rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100 disabled:opacity-50">
                            {completingId === a.id ? "Marking…" : "Mark as complete"}
                          </button>
                        )}
                        {a.patient && (a.status === "scheduled" || a.status === "pending_confirmation" || a.status === "card_on_file" || a.status === "paid") && ["clinical_intake", "followup_med_30", "followup_med_therapy_45"].includes(a.type) && (
                          (() => {
                            const noFormsRequired = a.requireFormsBeforeConfirm === false;
                            const hasForms = a.hasFormsForThisAppointment === true;
                            const count = a.formsAssignedCount ?? 0;
                            if (noFormsRequired) return (
                              <span className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">No forms required</span>
                            );
                            if (hasForms) return (
                              <span className="inline-flex items-center rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
                                {count === 1 ? "1 form assigned" : `${count} forms assigned`}
                              </span>
                            );
                            return (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setAssignFormsAppointment({ id: a.id, patientId: a.patient!.id }); setAssignFormsModalOpen(true); }}
                                className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                                No forms assigned
                              </button>
                            );
                          })()
                        )}
                        {a.status === "completed" && a.type === "orientation_consult" && a.patient && (
                          <>
                            {!a.patientHasPendingClinicalIntake && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setScheduleClinicalIntakeAppointment({ id: a.id, patientId: a.patient!.id, patientName: a.patient!.name || "" }); setScheduleClinicalIntakeOpen(true); }}
                                className="inline-flex items-center rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-cta/30 hover:text-cta">
                                Schedule clinical intake →
                              </button>
                            )}
                            <button type="button" onClick={(e) => { e.stopPropagation(); rejectAfterOrientation(a.id); }} disabled={rejectingId !== null}
                              className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
                              {rejectingId === a.id ? "Rejecting…" : "Reject patient"}
                            </button>
                          </>
                        )}
                        {a.status === "completed" && FOLLOWUP_ELIGIBLE_TYPES.includes(a.type) && a.patient && !a.patientHasScheduledFollowup && a.id === latestScheduleFollowupId && (
                          <button type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const patientId = a.patient!.id;
                              const patientName = a.patient!.name || "";
                              if (openingFollowupForPatientId === patientId || scheduleFollowupOpen) return;
                              setOpeningFollowupForPatientId(patientId);
                              const openModal = (allowedTypes: string[]) => { setScheduleFollowupPatient({ patientId, patientName, allowedTypes }); setScheduleFollowupOpen(true); };
                              requestAnimationFrame(() => {
                                fetch(`/api/appointments/patient/${patientId}/allowed-followup-types`, { credentials: "include" })
                                  .then((res) => (res.ok ? res.json() : {}))
                                  .then((data: { allowedTypes?: string[] }) => { const allowed = data.allowedTypes ?? ["followup_med_30", "followup_med_therapy_45"]; requestAnimationFrame(() => openModal(allowed)); })
                                  .catch(() => { requestAnimationFrame(() => openModal(["followup_med_30", "followup_med_therapy_45"])); })
                                  .finally(() => { setOpeningFollowupForPatientId((curr) => (curr === patientId ? null : curr)); });
                              });
                            }}
                            disabled={openingFollowupForPatientId === a.patient.id}
                            className="inline-flex items-center rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-cta/30 hover:text-cta">
                            {openingFollowupForPatientId === a.patient.id ? "Opening…" : "Schedule follow-up →"}
                          </button>
                        )}
                        {a.patient && (
                          <Link href={`/doctor/patients/${a.patient.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-cta/30 hover:text-cta">
                            View patient
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                </div>
              </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-200 bg-white px-5 py-3.5 shadow-sm">
              <p className="text-sm text-gray-500">
                Showing {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={goPrev} disabled={loading || prevStack.length === 0}
                  className="rounded-xl border border-cream-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-cream-50 disabled:opacity-40 disabled:pointer-events-none">
                  Previous
                </button>
                <button type="button" onClick={goNext} disabled={loading || !hasMore || !nextCursor}
                  className="rounded-xl border border-cream-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-cream-50 disabled:opacity-40 disabled:pointer-events-none">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AssignFormsModal
        isOpen={assignFormsModalOpen}
        onClose={() => {
          setAssignFormsModalOpen(false);
          setAssignFormsAppointment(null);
        }}
        patientId={assignFormsAppointment?.patientId || ""}
        appointmentId={assignFormsAppointment?.id || null}
        onSuccess={() => {
          showNotice("success", "Forms assigned successfully!");
          load(pageCursor);
        }}
      />
      <ScheduleClinicalIntakeModal
        isOpen={scheduleClinicalIntakeOpen}
        onClose={() => {
          setScheduleClinicalIntakeOpen(false);
          setScheduleClinicalIntakeAppointment(null);
        }}
        patientId={scheduleClinicalIntakeAppointment?.patientId || ""}
        patientName={scheduleClinicalIntakeAppointment?.patientName}
        onSuccess={() => {
          showNotice("success", "Clinical intake scheduled. Patient will confirm and add card.");
          load(pageCursor);
        }}
      />
      <SetAllowedFollowupModal
        isOpen={setFollowupModalOpen}
        onClose={() => {
          setSetFollowupModalOpen(false);
          setSetFollowupPatient(null);
        }}
        patientId={setFollowupPatient?.patientId || ""}
        patientName={setFollowupPatient?.patientName}
        onSuccess={() => {
          showNotice("success", "Follow-up type saved.");
          load(pageCursor);
        }}
      />
      <ScheduleFollowupModal
        isOpen={scheduleFollowupOpen}
        onClose={() => {
          setScheduleFollowupOpen(false);
          setScheduleFollowupPatient(null);
        }}
        patientId={scheduleFollowupPatient?.patientId || ""}
        patientName={scheduleFollowupPatient?.patientName}
        allowedTypes={scheduleFollowupPatient?.allowedTypes}
        onSuccess={() => {
          showNotice("success", "Follow-up scheduled. Patient will confirm and add card.");
          // Data changed; reload from page 1 to avoid stale cursor inconsistencies.
          setPageCursor(null);
          setPrevStack([]);
          setNextCursor(null);
          setHasMore(false);
          setLoading(true);
          load(null, view, searchApplied);
        }}
      />
      <ConfirmChargeModal
        isOpen={!!chargeConfirmAppointment}
        onClose={() => setChargeConfirmAppointment(null)}
        appointment={chargeConfirmAppointment}
        onSuccess={() => {
          setChargeConfirmAppointment(null);
          showNotice("success", "Payment successful. Receipt sent by Stripe.");
          load(pageCursor);
        }}
      />
      <RescheduleModal
        isOpen={!!rescheduleAppointment}
        onClose={() => setRescheduleAppointment(null)}
        appointmentId={rescheduleAppointment?.id ?? ""}
        durationMinutes={rescheduleAppointment?.durationMinutes ?? 30}
        appointmentType={rescheduleAppointment?.type}
        variant={rescheduleAppointment?.status === "pending_confirmation" ? "change-proposed-time" : "reschedule"}
        onSuccess={() => {
          setRescheduleAppointment(null);
          showNotice(
            "success",
            rescheduleAppointment?.status === "pending_confirmation" ? "Proposed time updated." : "Appointment rescheduled."
          );
          load(pageCursor);
        }}
      />
    </main>
    </div>
  );
}
