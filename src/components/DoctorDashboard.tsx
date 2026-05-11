"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmChargeModal from "@/components/ConfirmChargeModal";
import { formatPhone } from "@/lib/formatPhone";

type PatientRequest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string | null;
  status: string;
  rejectedNote: string | null;
  createdAt: string;
  consentAt: string | null;
  questionnaireData: Record<string, unknown> | null;
  user: { id: string; email: string } | null;
};

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

export default function DoctorDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [intakes, setIntakes] = useState<unknown[]>([]);
  const [intakesLoading, setIntakesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [expandedPrescreen, setExpandedPrescreen] = useState<Set<string>>(new Set());
  const [chargingAppointmentId, setChargingAppointmentId] = useState<string | null>(null);
  const [chargeConfirmAppointment, setChargeConfirmAppointment] = useState<Appointment | null>(null);
  const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);

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
    };
  }, []);

  async function load() {
    const res = await fetch("/api/patient-requests/", { credentials: "include" });
    if (res.status === 401) {
      router.push("/doctor/login");
      return;
    }
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  }

  async function loadIntakes() {
    const res = await fetch("/api/intake/all", { credentials: "include" });
    if (res.status === 401) {
      router.push("/doctor/login");
      return;
    }
    const data = await res.json();
    setIntakes(Array.isArray(data) ? data : []);
    setIntakesLoading(false);
  }

  async function loadAppointments() {
    try {
      const res = await fetch("/api/appointments/paged?limit=50", { credentials: "include" });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        console.error("Failed to load appointments:", res.status);
        setAppointmentsLoading(false);
        return;
      }
      const data = await res.json();
      setAppointments(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("Error loading appointments:", err);
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  }

  // Cache timezone label to avoid recalculating in render loop
  const [tzLabel, setTzLabel] = useState("PT");
  
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

  // Memoize formatted appointments to prevent recalculation on every render
  const formattedAppointments = useMemo(() => {
    return appointments.map((a) => {
      let formattedDate = "Date TBD";
      try {
        if (a.scheduledAt) {
          const date = new Date(a.scheduledAt);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleString("en-US", {
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
      return { ...a, formattedDate };
    });
  }, [appointments, tzLabel]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      load(),
      loadAppointments(),
    ]).catch(() => {
      // Errors already handled in individual functions
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chargeAppointment(id: string) {
    // Prevent multiple simultaneous charges
    if (chargingAppointmentId !== null) {
      return;
    }
    
    setChargingAppointmentId(id);
    
    try {
      const res = await fetch(`/api/appointments/${id}/charge`, {
        method: "POST",
        credentials: "include",
      });
      
      if (res.status === 401) {
        setChargingAppointmentId(null);
        router.push("/doctor/login");
        return;
      }
      
      if (!res.ok) {
        let errorMessage = "Charge failed";
        try {
          const err = await res.json();
          errorMessage = err.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        setChargingAppointmentId(null);
        showNotice("error", errorMessage);
        return;
      }
      
      // Parse response to check if it succeeded
      try {
        const result = await res.json();
        if (result.ok) {
          // Show success message
          const successMessage = result.message || "Payment successful! Receipt sent by Stripe.";
          showNotice("success", successMessage);
          // Small delay before reloading to ensure backend has updated
          await new Promise(resolve => setTimeout(resolve, 500));
          // Reload appointments to show updated status
          await loadAppointments();
        } else {
          showNotice("info", "Charge completed but status unclear. Please refresh the page.");
        }
      } catch (parseErr) {
        console.error("Failed to parse charge response:", parseErr);
        // Still try to reload appointments
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadAppointments();
        showNotice("info", "Charge may have succeeded. Please check the appointment status.");
      }
    } catch (err) {
      console.error("Charge error:", err);
      showNotice("error", "Network error while charging. Please try again.");
    } finally {
      // Always reset charging state
      setChargingAppointmentId(null);
    }
  }

  async function completeAppointment(id: string) {
    // Prevent multiple simultaneous completions
    if (completingAppointmentId !== null) {
      return;
    }
    
    setCompletingAppointmentId(id);
    
    try {
      const res = await fetch(`/api/appointments/${id}/complete`, {
        method: "POST",
        credentials: "include",
      });
      
      if (res.status === 401) {
        setCompletingAppointmentId(null);
        router.push("/doctor/login");
        return;
      }
      
      if (!res.ok) {
        let errorMessage = "Failed to mark as completed";
        try {
          const err = await res.json();
          errorMessage = err.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        setCompletingAppointmentId(null);
        showNotice("error", errorMessage);
        return;
      }
      
      // Parse response to check if it succeeded
      try {
        const result = await res.json();
        if (result.ok) {
          // Show success message
          const successMessage = result.message || "Appointment marked as completed.";
          showNotice("success", successMessage);
          // Small delay before reloading to ensure backend has updated
          await new Promise(resolve => setTimeout(resolve, 300));
          // Reload appointments to show updated status
          await loadAppointments();
        }
      } catch (parseErr) {
        console.error("Failed to parse complete response:", parseErr);
        // Still try to reload appointments
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadAppointments();
      }
    } catch (err) {
      console.error("Complete error:", err);
      showNotice("error", "Network error while marking as completed. Please try again.");
    } finally {
      // Always reset completing state
      setCompletingAppointmentId(null);
    }
  }

  async function approve(id: string) {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/patient-requests/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        showNotice("error", data.error || "Failed to approve");
        return;
      }
      await load();
    } finally {
      setApprovingId(null);
    }
  }

  async function reject(id: string) {
    setRejectingId(id);
    try {
      const res = await fetch(`/api/patient-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectedNote: rejectNote[id] || undefined }),
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        showNotice("error", data.error || "Failed to reject");
        return;
      }
      setRejectNote((prev) => ({ ...prev, [id]: "" }));
      await load();
    } finally {
      setRejectingId(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }

  const pending = requests.filter(
    (r) =>
      r.status === "pending" &&
      r.questionnaireData != null &&
      Object.keys(r.questionnaireData).length > 0
  );
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="min-h-screen bg-cream-50">
      {notice && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`w-full max-w-xl rounded-lg border px-4 py-3 shadow-lg ${
              notice.type === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-cream-200 bg-white text-navy"
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

      <header className="sticky top-0 z-40 border-b border-cream-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-semibold text-cta">
            TelePsych — Doctor Portal
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-cta/40 bg-white px-4 py-2 text-sm font-medium text-cta shadow-sm transition-colors hover:bg-cta hover:text-white focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="section-heading">Patient Requests</h1>
        <p className="mt-2 text-gray-600">
          Review new patient access requests. Approve to create their account and send login credentials; reject to decline.
        </p>

        {loading ? (
          <p className="mt-10 text-gray-500">Loading…</p>
        ) : (
          <>
            {pending.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-cta">Pending</h2>
                <ul className="mt-4 space-y-4">
                  {pending.map((req) => (
                    <li key={req.id} className="card">
                      <div className="flex flex-wrap justify-between gap-4">
                        <div>
                          <p className="font-medium text-navy">
                            {req.firstName} {req.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{req.email}</p>
                          <p className="text-sm text-gray-600">{formatPhone(req.phone)}</p>
                          {req.notes && (
                            <p className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Notes:</span> {req.notes}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            Submitted {new Date(req.createdAt).toLocaleString()}
                            {req.consentAt && (
                              <> · Consent {new Date(req.consentAt).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => approve(req.id)}
                            disabled={!!approvingId}
                            className="btn-primary whitespace-nowrap"
                          >
                            {approvingId === req.id ? "Approving…" : "Approve"}
                          </button>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Rejection note (optional)"
                              value={rejectNote[req.id] ?? ""}
                              onChange={(e) =>
                                setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))
                              }
                              className="rounded-lg border border-cream-200 px-3 py-1.5 text-sm"
                            />
                            <button
                              onClick={() => reject(req.id)}
                              disabled={!!rejectingId}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                            >
                              {rejectingId === req.id ? "Rejecting…" : "Reject"}
                            </button>
                          </div>
                        </div>
                      </div>
                      {(req.consentAt || req.questionnaireData) && (
                        <div className="mt-4 border-t border-cream-200 pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPrescreen((prev) => {
                                const next = new Set(prev);
                                if (next.has(req.id)) next.delete(req.id);
                                else next.add(req.id);
                                return next;
                              })
                            }
                            className="text-sm font-medium text-cta hover:underline"
                          >
                            {expandedPrescreen.has(req.id) ? "Hide" : "Show"} pre-screening responses
                          </button>
                          {expandedPrescreen.has(req.id) && (
                            <div className="mt-3 rounded-lg bg-gray-50 p-4">
                              {req.consentAt && (
                                <p className="text-xs text-gray-600">
                                  Consent given: {new Date(req.consentAt).toLocaleString()}
                                </p>
                              )}
                              {req.questionnaireData && Object.keys(req.questionnaireData).length > 0 ? (
                                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-sm text-navy">
                                  {JSON.stringify(req.questionnaireData, null, 2)}
                                </pre>
                              ) : (
                                <p className="mt-2 text-sm text-gray-500">No questionnaire data yet.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {pending.length === 0 && requests.length === 0 && (
              <p className="mt-10 text-gray-500">No patient requests yet.</p>
            )}
            {processed.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-cta">Processed</h2>
                <ul className="mt-4 space-y-3">
                  {processed.map((req) => (
                    <li key={req.id} className="card flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-navy">
                          {req.firstName} {req.lastName} — {req.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          {req.status === "approved" ? "Approved" : "Rejected"}
                          {req.rejectedNote && `: ${req.rejectedNote}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-12">
              <h2 className="text-lg font-semibold text-cta">Appointments</h2>
              <p className="mt-1 text-sm text-gray-600">Your upcoming and past appointments.</p>
              {appointmentsLoading ? (
                <p className="mt-4 text-gray-500">Loading…</p>
              ) : appointments.length === 0 ? (
                <p className="mt-4 text-gray-500">No appointments yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {formattedAppointments.slice(0, 20).map((a) => (
                    <li key={a.id} className="card flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-navy">
                          {a.formattedDate}
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
                              className="text-sm font-medium text-cta hover:underline"
                            >
                              Join video call →
                            </a>
                          </p>
                        )}
                        {a.status === "card_on_file" && (
                          <p className="mt-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setChargeConfirmAppointment(a);
                              }}
                              className="text-sm font-medium text-cta hover:underline"
                            >
                              Charge now
                            </button>
                          </p>
                        )}
                        {a.status === "paid" && (
                          <p className="mt-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (completingAppointmentId === null) {
                                  completeAppointment(a.id);
                                }
                              }}
                              disabled={completingAppointmentId !== null}
                              className="text-sm font-medium text-green-700 hover:underline disabled:opacity-50"
                            >
                              {completingAppointmentId === a.id ? "Marking…" : "Mark as complete"}
                            </button>
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
              )}
            </section>
          </>
        )}

        <ConfirmChargeModal
          isOpen={!!chargeConfirmAppointment}
          onClose={() => setChargeConfirmAppointment(null)}
          appointment={chargeConfirmAppointment}
          onSuccess={() => {
            setChargeConfirmAppointment(null);
            showNotice("success", "Payment successful. Receipt sent by Stripe.");
            loadAppointments();
          }}
        />
      </main>
    </div>
  );
}
