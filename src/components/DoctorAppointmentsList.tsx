"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AssignFormsModal from "@/components/AssignFormsModal";

type Appointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  type: string;
  notes: string | null;
  meetLink?: string | null;
  patient?: { id: string; email: string; name: string };
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
  const [loading, setLoading] = useState(true);
  const [chargingId, setChargingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openingMeetId, setOpeningMeetId] = useState<string | null>(null);
  const [assignFormsModalOpen, setAssignFormsModalOpen] = useState(false);
  const [assignFormsAppointment, setAssignFormsAppointment] = useState<{ id: string; patientId: string } | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [tzLabel, setTzLabel] = useState("PT");
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

  async function load(cursor: string | null, nextView?: "active" | "completed") {
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
    mountedRef.current = true;
    load(null).catch(() => {
      // Errors already handled in load()
    });
    return () => {
      mountedRef.current = false;
      loadingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When switching tabs or date filter, reset pagination and reload.
  useEffect(() => {
    setLoading(true);
    setPageCursor(null);
    setPrevStack([]);
    setNextCursor(null);
    setHasMore(false);
    load(null, view).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filterDate]);

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
    await load(nextCursor);
  }

  async function goPrev() {
    if (prevStack.length === 0) return;
    const prevCursor = prevStack[prevStack.length - 1] ?? null;
    setPrevStack((prev) => prev.slice(0, -1));
    setPageCursor(prevCursor);
    setLoading(true);
    await load(prevCursor);
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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

      {loading ? (
        <p className="mt-10 text-gray-500">Loading…</p>
      ) : appointments.length === 0 ? (
        <p className="mt-10 text-gray-500">
          {filterDate
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
                  {a.meetLink && (a.status === "scheduled" || a.status === "card_on_file" || a.status === "paid") && (
                    <p className="mt-1.5">
                      <a
                        href={a.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          // Rapid multi-clicks can open many tabs and crash Chrome.
                          // Allow the first click, then block repeats briefly.
                          if (openingMeetId === a.id) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          setOpeningMeetId(a.id);
                          window.setTimeout(() => {
                            setOpeningMeetId((curr) => (curr === a.id ? null : curr));
                          }, 2000);
                        }}
                        className="text-sm font-medium text-warm-brown hover:underline"
                      >
                        {openingMeetId === a.id ? "Opening…" : "Join video call →"}
                      </a>
                    </p>
                  )}
                  {a.status === "card_on_file" && (
                    <p className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => chargeAppointment(a.id)}
                        disabled={chargingId !== null}
                        className="text-sm font-medium text-warm-brown hover:underline disabled:opacity-50"
                      >
                        {chargingId === a.id ? "Charging…" : "Charge now"}
                      </button>
                    </p>
                  )}
                  {a.status === "paid" && (
                    <p className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => completeAppointment(a.id)}
                        disabled={completingId !== null}
                        className="text-sm font-medium text-green-700 hover:underline disabled:opacity-50"
                      >
                        {completingId === a.id ? "Marking…" : "Mark as complete"}
                      </button>
                    </p>
                  )}
                  {a.status === "completed" && a.type === "intake" && a.patient && (
                    <p className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignFormsAppointment({ id: a.id, patientId: a.patient!.id });
                          setAssignFormsModalOpen(true);
                        }}
                        className="text-sm font-medium text-warm-brown hover:underline"
                      >
                        Assign forms →
                      </button>
                    </p>
                  )}
                  {a.patient && (
                    <p className="mt-1.5">
                      <Link
                        href={`/doctor/patients/${a.patient.id}`}
                        className="text-sm font-medium text-gray-700 hover:underline"
                      >
                        View patient →
                      </Link>
                    </p>
                  )}
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
    </main>
  );
}
