"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

type IntakeSummary = {
  id: string;
  userId: string;
  patientName: string;
  patientEmail: string;
  status: string;
  reviewedAt: string | null;
  updatedAt: string;
};

type Appointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  type: string;
  notes: string | null;
  patient?: { id: string; email: string; name: string };
};

export default function DoctorDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [intakes, setIntakes] = useState<IntakeSummary[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakesLoading, setIntakesLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedIntake, setSelectedIntake] = useState<{ id: string; formData: Record<string, unknown>; patientName: string } | null>(null);
  const [expandedPrescreen, setExpandedPrescreen] = useState<Set<string>>(new Set());

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
    const res = await fetch("/api/appointments/", { credentials: "include" });
    if (res.status === 401) {
      router.push("/doctor/login");
      return;
    }
    const data = await res.json();
    setAppointments(Array.isArray(data) ? data : []);
    setAppointmentsLoading(false);
  }

  useEffect(() => {
    load();
    loadIntakes();
    loadAppointments();
  }, []);

  async function markIntakeReviewed(id: string) {
    setReviewingId(id);
    try {
      const res = await fetch(`/api/intake/${id}/review`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to mark reviewed");
        return;
      }
      await loadIntakes();
      setSelectedIntake((prev) => (prev?.id === id ? null : prev));
    } finally {
      setReviewingId(null);
    }
  }

  async function openIntake(id: string) {
    const res = await fetch(`/api/intake/${id}`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setSelectedIntake({ id: data.id, formData: data.formData || {}, patientName: data.patientName || "Patient" });
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
        alert(data.error || "Failed to approve");
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
        alert(data.error || "Failed to reject");
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
      <header className="sticky top-0 z-40 border-b border-cream-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-semibold text-warm-brown">
            TelePsych — Doctor Portal
          </Link>
          <button onClick={logout} className="text-sm text-gray-600 hover:text-warm-brown">
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
                <h2 className="text-lg font-semibold text-warm-brown">Pending</h2>
                <ul className="mt-4 space-y-4">
                  {pending.map((req) => (
                    <li key={req.id} className="card">
                      <div className="flex flex-wrap justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {req.firstName} {req.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{req.email}</p>
                          <p className="text-sm text-gray-600">{req.phone}</p>
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
                            className="text-sm font-medium text-warm-brown hover:underline"
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
                                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-sm text-gray-800">
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
                <h2 className="text-lg font-semibold text-warm-brown">Processed</h2>
                <ul className="mt-4 space-y-3">
                  {processed.map((req) => (
                    <li key={req.id} className="card flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">
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
              <h2 className="text-lg font-semibold text-warm-brown">Intake submissions</h2>
              <p className="mt-1 text-sm text-gray-600">
                Review patient intake forms. Mark as reviewed when done.
              </p>
              {intakesLoading ? (
                <p className="mt-4 text-gray-500">Loading…</p>
              ) : intakes.length === 0 ? (
                <p className="mt-4 text-gray-500">No intake submissions yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {intakes.map((i) => (
                    <li key={i.id} className="card flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{i.patientName}</p>
                        <p className="text-sm text-gray-600">{i.patientEmail}</p>
                        <p className="text-xs text-gray-500">
                          {i.status} · Updated {new Date(i.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openIntake(i.id)}
                          className="btn-secondary text-sm"
                        >
                          View
                        </button>
                        {i.status === "submitted" && (
                          <button
                            type="button"
                            onClick={() => markIntakeReviewed(i.id)}
                            disabled={!!reviewingId}
                            className="btn-primary text-sm"
                          >
                            {reviewingId === i.id ? "…" : "Mark reviewed"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-12">
              <h2 className="text-lg font-semibold text-warm-brown">Appointments</h2>
              <p className="mt-1 text-sm text-gray-600">Your upcoming and past appointments.</p>
              {appointmentsLoading ? (
                <p className="mt-4 text-gray-500">Loading…</p>
              ) : appointments.length === 0 ? (
                <p className="mt-4 text-gray-500">No appointments yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {appointments.slice(0, 20).map((a) => (
                    <li key={a.id} className="card flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(a.scheduledAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {a.durationMinutes} min · {a.type}
                          {a.patient?.name && ` · ${a.patient.name}`}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          a.status === "scheduled"
                            ? "bg-green-100 text-green-800"
                            : a.status === "cancelled"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {selectedIntake && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedIntake(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-cream-200 bg-white p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-warm-brown">{selectedIntake.patientName} — Intake</h3>
              <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
                {JSON.stringify(selectedIntake.formData, null, 2)}
              </pre>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => markIntakeReviewed(selectedIntake.id)}
                  disabled={!!reviewingId}
                  className="btn-primary"
                >
                  {reviewingId === selectedIntake.id ? "…" : "Mark reviewed"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIntake(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
