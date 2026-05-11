"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RescheduleModal from "@/components/RescheduleModal";
import ConfirmCancelModal from "@/components/ConfirmCancelModal";

// Practice timezone (California) – always show appointments in Pacific time
const PRACTICE_TZ = "America/Los_Angeles";

const RESCHEDULABLE_STATUSES = ["scheduled", "card_on_file", "paid"];
const PAGE_SIZE = 10;

function canReschedule(a: {
  scheduledAt: string;
  status: string;
  patientRescheduleCount?: number;
}): boolean {
  if (!RESCHEDULABLE_STATUSES.includes(a.status)) return false;
  if ((a.patientRescheduleCount ?? 0) >= 1) return false;
  try {
    const scheduledAt = new Date(a.scheduledAt);
    if (isNaN(scheduledAt.getTime())) return false;
    const now = new Date();
    return scheduledAt > now;
  } catch {
    return false;
  }
}

function canCancel(a: { scheduledAt: string; status: string }): boolean {
  const cancelableStatuses = ["scheduled", "card_on_file", "paid"];
  if (!cancelableStatuses.includes(a.status)) return false;
  try {
    const scheduledAt = new Date(a.scheduledAt);
    if (isNaN(scheduledAt.getTime())) return false;
    return scheduledAt > new Date();
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
  doctor?: { id: string; email: string; name: string };
  meetLink?: string | null;
  hasPendingFormsForThisAppointment?: boolean;
  patientRescheduleCount?: number;
};

function formatAppointmentDateTime(iso: string): string {
  try {
    if (!iso) return "Date TBD";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleString("en-US", {
      timeZone: PRACTICE_TZ,
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
    });
  } catch {
    return "Date error";
  }
}

export default function PatientAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [tzLabel, setTzLabel] = useState("PT");
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const lastInteractionAtRef = useRef<Record<string, number>>({});
  const lastPastSectionClickRef = useRef(0);
  const PAST_CLICK_THROTTLE_MS = 1500;

  // Cache timezone label to avoid recalculating on every render
  useEffect(() => {
    try {
      const d = new Date();
      const tzName = d.toLocaleTimeString("en-US", {
        timeZone: PRACTICE_TZ,
        timeZoneName: "short",
      });
      const match = tzName.match(/\s([A-Z]{3,4})$/);
      setTzLabel(match ? match[1] : "PT");
    } catch {
      setTzLabel("PT");
    }
  }, []);

  async function load(cursor?: string | null, append = false) {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/appointments/paged?${params}`, { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        console.error("Failed to load appointments:", res.status);
        if (!append) setAppointments([]);
        return;
      }
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setAppointments((prev) => (append ? [...prev, ...items] : items));
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(!!data?.hasMore);
    } catch (err) {
      console.error("Error loading appointments:", err);
      if (!append) setAppointments([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    if (nextCursor && !loadingMore) load(nextCursor, true);
  }

  function openCancelConfirm(a: Appointment) {
    setCancelTarget(a);
  }

  async function confirmCancelAppointment() {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) {
      load();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "Failed to cancel appointment.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    load().then(() => {
      if (!cancelled) setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize filtered appointments to prevent recalculation on every render
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcomingList = appointments.filter((a) => {
      try {
        if (!a.scheduledAt) return false;
        const appointmentTime = new Date(a.scheduledAt);
        if (isNaN(appointmentTime.getTime())) return false;
        // Include scheduled, card_on_file, and paid status as upcoming if in the future
        const isFuture = appointmentTime >= now;
        const isUpcomingStatus =
          a.status === "scheduled" ||
          a.status === "card_on_file" ||
          a.status === "paid" ||
          a.status === "pending_confirmation";
        return isUpcomingStatus && isFuture;
      } catch {
        return false;
      }
    });
    const pastList = appointments.filter((a) => {
      try {
        if (!a.scheduledAt) {
          // If no scheduledAt, consider it past if completed/cancelled
          return a.status === "completed" || a.status === "cancelled";
        }
        const appointmentTime = new Date(a.scheduledAt);
        if (isNaN(appointmentTime.getTime())) {
          // Invalid date, consider it past if completed/cancelled
          return a.status === "completed" || a.status === "cancelled";
        }
        // Past if: completed/cancelled OR (scheduled/card_on_file/paid but in the past)
        return a.status === "completed" || a.status === "cancelled" || appointmentTime < now;
      } catch {
        return false;
      }
    });
    return { upcoming: upcomingList, past: pastList };
  }, [appointments]);

  if (loading) {
    return <p className="text-gray-500">Loading appointments…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-cta">Appointments</h2>
        <Link href="/patient/book" className="btn-primary">
          Book appointment
        </Link>
      </div>
      {upcoming.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-600">Upcoming</h3>
          <ul className="mt-2 space-y-3">
            {upcoming.map((a) => {
              const formattedDateTime = formatAppointmentDateTime(a.scheduledAt);
              return (
                <li
                  key={a.id}
                  className="card flex flex-wrap items-center justify-between gap-4"
                  onClickCapture={(e) => {
                    const now = Date.now();
                    const last = lastInteractionAtRef.current[a.id] ?? 0;
                    if (now - last < 1200) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    lastInteractionAtRef.current[a.id] = now;
                  }}
                >
                  <div>
                    <p className="font-medium text-navy">
                      {formattedDateTime} {tzLabel}
                    </p>
                    <p className="text-sm text-gray-600">
                      {a.durationMinutes} min · {a.type}
                      {a.doctor?.name && ` · ${a.doctor.name}`}
                    </p>
                    {a.status === "pending_confirmation" ? (
                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                          {a.hasPendingFormsForThisAppointment ? (
                            <Link
                              href="/patient/forms"
                              className="inline-flex items-center text-xs font-medium text-cta hover:underline"
                            >
                              Complete forms first →
                            </Link>
                          ) : (
                            <Link
                              href={`/patient/confirm-scheduled?appointmentId=${encodeURIComponent(a.id)}`}
                              className="inline-flex items-center text-xs font-medium text-cta hover:underline"
                            >
                              Confirm & add payment →
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRescheduleAppointment(a);
                            }}
                            className="text-xs font-medium text-cta hover:underline"
                          >
                            Change time
                          </button>
                          {canCancel(a) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openCancelConfirm(a);
                              }}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Cancel appointment
                            </button>
                          )}
                        </p>
                      ) : (
                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                          {a.meetLink &&
                            (a.status === "scheduled" ||
                              a.status === "card_on_file" ||
                              a.status === "paid") && (
                              <a
                                href={a.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs font-medium text-cta hover:underline"
                              >
                                Join video visit
                              </a>
                            )}
                          {canReschedule(a) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRescheduleAppointment(a);
                              }}
                              className="text-xs font-medium text-cta hover:underline"
                            >
                              Reschedule
                            </button>
                          )}
                          {canCancel(a) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openCancelConfirm(a);
                              }}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Cancel appointment
                            </button>
                          )}
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
                            : a.status === "pending_confirmation"
                              ? "bg-amber-100 text-amber-800"
                              : a.status === "completed"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {a.status === "card_on_file"
                      ? "Card on file"
                      : a.status === "paid"
                        ? "Paid"
                        : a.status === "pending_confirmation"
                          ? "Confirm required"
                          : a.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <RescheduleModal
        isOpen={!!rescheduleAppointment}
        onClose={() => setRescheduleAppointment(null)}
        appointmentId={rescheduleAppointment?.id ?? ""}
        durationMinutes={rescheduleAppointment?.durationMinutes ?? 30}
        appointmentType={rescheduleAppointment?.type}
        variant={rescheduleAppointment?.status === "pending_confirmation" ? "change-proposed-time" : "reschedule"}
        onSuccess={() => {
          setRescheduleAppointment(null);
          load();
        }}
      />
      <ConfirmCancelModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        appointmentLabel={cancelTarget ? `${formatAppointmentDateTime(cancelTarget.scheduledAt)} · ${cancelTarget.type}` : ""}
        onConfirm={confirmCancelAppointment}
      />
      {upcoming.length === 0 && appointments.length === 0 && (
        <p className="text-gray-500">No appointments yet. Book one when you’re ready.</p>
      )}
      {past.length > 0 && (
        <section
          className="select-none"
          role="region"
          aria-label="Past appointments"
          onClick={(e) => {
            const now = Date.now();
            if (now - lastPastSectionClickRef.current < PAST_CLICK_THROTTLE_MS) {
              e.preventDefault();
              e.stopPropagation();
            } else {
              lastPastSectionClickRef.current = now;
            }
          }}
        >
          <h3 className="text-sm font-medium text-gray-600">Past</h3>
          <ul className="mt-2 space-y-2">
            {past.slice(0, 10).map((a) => {
              const formattedDateTime = formatAppointmentDateTime(a.scheduledAt);
              return (
              <li
                key={a.id}
                className="rounded-lg border border-cream-200 bg-white p-4 text-sm"
                onClickCapture={(e) => {
                  const now = Date.now();
                  const last = lastInteractionAtRef.current[a.id] ?? 0;
                  if (now - last < PAST_CLICK_THROTTLE_MS) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  lastInteractionAtRef.current[a.id] = now;
                }}
              >
                <span className="text-navy">
                  {formattedDateTime} {tzLabel}
                </span>
                <span className="ml-2 text-gray-500">· {a.status}</span>
              </li>
            );
            })}
          </ul>
        </section>
      )}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-cream-300 bg-white px-4 py-2 text-sm font-medium text-cta hover:bg-cream-50 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
