"use client";

import { useEffect, useState, useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AssignFormsModal from "@/components/AssignFormsModal";
import SetAllowedFollowupModal from "@/components/SetAllowedFollowupModal";
import ScheduleFollowupModal from "@/components/ScheduleFollowupModal";
import ScheduleClinicalIntakeModal from "@/components/ScheduleClinicalIntakeModal";
import RescheduleModal from "@/components/RescheduleModal";
import ConfirmChargeModal from "@/components/ConfirmChargeModal";

const RESCHEDULABLE_STATUSES = ["scheduled", "card_on_file", "paid"];
const RESCHEDULE_MIN_HOURS = 48;

function canReschedule(a: { scheduledAt: string; status: string }): boolean {
  if (!RESCHEDULABLE_STATUSES.includes(a.status)) return false;
  try {
    const scheduledAt = new Date(a.scheduledAt);
    if (isNaN(scheduledAt.getTime())) return false;
    const now = new Date();
    const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= RESCHEDULE_MIN_HOURS;
  } catch {
    return false;
  }
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
  const [chargingId, setChargingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openingMeetId, setOpeningMeetId] = useState<string | null>(null);
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
  const [, startTransition] = useTransition();
  const loadingRef = useRef(false); // Prevent concurrent load() calls
  const mountedRef = useRef(true); // Track if component is mounted
  const lastInteractionAtRef = useRef<Record<string, number>>({});

  function showNotice(type: "success" | "error" | "info", message: string) {
    setNotice({ type, message });
    window.setTimeout(() => {
      setNotice((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

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
    // Prevent concurrent load() calls - critical for preventing crashes
    if (loadingRef.current || !mountedRef.current) {
      return;
    }
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
      });
      if (!mountedRef.current) return;
      
      if (res.status === 401) {
        router.push("/doctor/login");
        if (mountedRef.current) setLoading(false);
        loadingRef.current = false;
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
        loadingRef.current = false;
        return;
      }
      const data = await res.json();
      if (mountedRef.current) {
        const items = Array.isArray(data?.items) ? data.items : [];
        // Validate items shape defensively
        const validAppointments = items.filter(
          (a: unknown) => a && typeof a === "object" && "id" in a,
        ) as Appointment[];
        setAppointments(validAppointments);
        setNextCursor(typeof data?.nextCursor === "string" ? data.nextCursor : null);
        setHasMore(Boolean(data?.hasMore));
        setLoading(false);
      }
    } catch (err) {
      console.error("Error loading appointments:", err);
      if (mountedRef.current) {
        setAppointments([]);
        setNextCursor(null);
        setHasMore(false);
        setLoading(false);
      }
    } finally {
      loadingRef.current = false;
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

  async function chargeAppointment(id: string) {
    if (chargingId !== null) {
      return; // Prevent multiple simultaneous charges
    }
    setChargingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/charge`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        setChargingId(null);
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showNotice("error", err.detail || "Charge failed");
        setChargingId(null);
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
      console.error("Charge error:", err);
      if (mountedRef.current) {
        showNotice("error", "Network error while charging. Please try again.");
      }
    } finally {
      if (mountedRef.current) {
        setChargingId(null);
      }
    }
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

  function handleTileClickCapture(appointmentId: string, e: React.MouseEvent) {
    // If the user double/triple-clicks rapidly, browsers can spawn multiple navigations/tabs
    // (via nested <a> / <button> elements), which can crash Chrome.
    // Throttle interactions per appointment tile.
    const now = Date.now();
    const last = lastInteractionAtRef.current[appointmentId] ?? 0;
    if (now - last < 1200) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    lastInteractionAtRef.current[appointmentId] = now;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {notice && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`w-full max-w-xl rounded-lg border px-4 py-3 shadow-lg ${
              notice.type === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-cream-200 bg-white text-gray-900"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{notice.message}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-sm opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mb-6">
        <Link href="/doctor" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>
      <h1 className="section-heading">Appointments</h1>
      <p className="mt-2 text-gray-600">
        Your upcoming and past appointments.
      </p>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-cream-200 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setView("active")}
              className={`rounded-md px-3 py-1.5 ${
                view === "active" ? "bg-cream-100 text-warm-brown" : "text-gray-700 hover:bg-cream-50"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setView("completed")}
              className={`rounded-md px-3 py-1.5 ${
                view === "completed" ? "bg-cream-100 text-warm-brown" : "text-gray-700 hover:bg-cream-50"
              }`}
            >
              Completed
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="appt-date-filter" className="text-sm text-gray-600 whitespace-nowrap">
              Filter by date:
            </label>
            <input
              id="appt-date-filter"
              type="date"
              value={filterDate ?? ""}
              onChange={(e) => setFilterDate(e.target.value ? e.target.value : null)}
              className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm text-gray-900"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate(null)}
                className="text-sm text-warm-brown hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">{appointments.length}</span> appointments
        </div>
        </div>
        <div>
          <label htmlFor="appt-patient-search" className="sr-only">
            Search by patient name
          </label>
          <div className="relative max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </span>
            <input
              id="appt-patient-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by patient name…"
              className="w-full rounded-lg border border-cream-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-500"
              aria-label="Search by patient name"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-gray-500">Loading…</p>
      ) : appointments.length === 0 ? (
        <p className="mt-10 text-gray-500">
          {searchApplied
            ? `No appointments found for patient "${searchApplied}".`
            : filterDate
              ? `No appointments on ${new Date(filterDate + "T12:00:00").toLocaleDateString("en-US", {
                  timeZone: "America/Los_Angeles",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}.`
              : "No appointments yet."}
        </p>
      ) : (
        <div className="mt-10 space-y-6">
          <ul className="space-y-3">
            {formattedAppointments.map(({ appointment: a, formattedDate }) => (
              <li
                key={a.id}
                className="card flex flex-wrap items-center justify-between gap-4"
                onClickCapture={(e) => handleTileClickCapture(a.id, e)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {formattedDate}
                  </p>
                  <p className="text-sm text-gray-600">
                    {a.durationMinutes} min · {a.type}
                    {a.patient?.name && ` · ${a.patient.name}`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {a.meetLink && (a.status === "scheduled" || a.status === "card_on_file" || a.status === "paid") && (
                      <a
                        href={a.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (openingMeetId === a.id) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          setOpeningMeetId(a.id);
                          window.setTimeout(() => setOpeningMeetId((curr) => (curr === a.id ? null : curr)), 2000);
                        }}
                        className="inline-flex items-center rounded-lg border border-warm-brown/50 bg-warm-brown/5 px-3 py-1.5 text-sm font-medium text-warm-brown hover:bg-warm-brown/10"
                      >
                        {openingMeetId === a.id ? "Opening…" : "Join video call →"}
                      </a>
                    )}
                    {a.status === "pending_confirmation" && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setRescheduleAppointment(a); }}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Change time
                      </button>
                    )}
                    {canReschedule(a) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setRescheduleAppointment(a); }}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Reschedule
                      </button>
                    )}
                    {a.status === "card_on_file" && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setChargeConfirmAppointment(a); }}
                        className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                      >
                        Charge now
                      </button>
                    )}
                    {a.status === "paid" && (
                      <button
                        type="button"
                        onClick={() => completeAppointment(a.id)}
                        disabled={completingId !== null}
                        className="inline-flex items-center rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                      >
                        {completingId === a.id ? "Marking…" : "Mark as complete"}
                      </button>
                    )}
                    {a.patient && (a.status === "scheduled" || a.status === "pending_confirmation" || a.status === "card_on_file" || a.status === "paid") && ["clinical_intake", "followup_med_30", "followup_med_therapy_45"].includes(a.type) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignFormsAppointment({ id: a.id, patientId: a.patient!.id });
                          setAssignFormsModalOpen(true);
                        }}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Assign forms →
                      </button>
                    )}
                    {a.status === "completed" && a.type === "orientation_consult" && a.patient && (
                      <>
                        {!a.patientHasAssignedForms && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignFormsAppointment({ id: a.id, patientId: a.patient!.id });
                              setAssignFormsModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Assign forms →
                          </button>
                        )}
                        {!a.patientHasPendingClinicalIntake && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setScheduleClinicalIntakeAppointment({
                                id: a.id,
                                patientId: a.patient!.id,
                                patientName: a.patient!.name || "",
                              });
                              setScheduleClinicalIntakeOpen(true);
                            }}
                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Schedule clinical intake →
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); rejectAfterOrientation(a.id); }}
                          disabled={rejectingId !== null}
                          className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {rejectingId === a.id ? "Rejecting…" : "Reject patient"}
                        </button>
                      </>
                    )}
                    {a.status === "completed" && (a.type === "intake" || a.type === "clinical_intake") && a.patient && !a.patientHasScheduledFollowup && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const patientId = a.patient!.id;
                          const patientName = a.patient!.name || "";
                          try {
                            const res = await fetch(`/api/appointments/patient/${patientId}/allowed-followup-types`, { credentials: "include" });
                            const data = res.ok ? await res.json() : {};
                            const allowedTypes = data.allowedTypes ?? ["followup_med_30", "followup_med_therapy_45"];
                            startTransition(() => {
                              setScheduleFollowupPatient({ patientId, patientName, allowedTypes });
                              setScheduleFollowupOpen(true);
                            });
                          } catch {
                            startTransition(() => {
                              setScheduleFollowupPatient({ patientId, patientName, allowedTypes: ["followup_med_30", "followup_med_therapy_45"] });
                              setScheduleFollowupOpen(true);
                            });
                          }
                        }}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Schedule follow-up →
                      </button>
                    )}
                    {a.patient && (
                      <Link
                        href={`/doctor/patients/${a.patient.id}`}
                        className="inline-flex items-center rounded-lg border border-warm-brown/50 bg-white px-3 py-1.5 text-sm font-medium text-warm-brown hover:bg-warm-brown/5"
                      >
                        View patient →
                      </Link>
                    )}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    a.status === "scheduled"
                      ? "bg-green-100 text-green-800"
                      : a.status === "card_on_file"
                        ? "bg-amber-100 text-amber-800"
                        : a.status === "paid"
                          ? "bg-blue-100 text-blue-800"
                          : a.status === "completed"
                            ? "bg-purple-100 text-purple-800"
                            : a.status === "pending_confirmation"
                              ? "bg-amber-100 text-amber-800"
                              : a.status === "cancelled"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {a.status === "card_on_file" ? "Card on file" : a.status === "paid" ? "Paid" : a.status}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={loading || prevStack.length === 0}
              className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-cream-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={loading || !hasMore || !nextCursor}
              className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-cream-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
          load(pageCursor);
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
  );
}
