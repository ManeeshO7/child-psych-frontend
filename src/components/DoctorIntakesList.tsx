"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type IntakeSummary = {
  id: string;
  userId: string;
  patientName: string;
  patientEmail: string;
  status: string;
  reviewedAt: string | null;
  updatedAt: string;
};

export default function DoctorIntakesList() {
  const router = useRouter();
  const [intakes, setIntakes] = useState<IntakeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedIntake, setSelectedIntake] = useState<{
    id: string;
    formData: Record<string, unknown>;
    patientName: string;
  } | null>(null);

  async function loadIntakes() {
    const res = await fetch("/api/intake/all", { credentials: "include" });
    if (res.status === 401) {
      router.push("/doctor/login");
      return;
    }
    const data = await res.json();
    setIntakes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadIntakes();
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
    const res = await fetch(`/api/intake/${id}`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    setSelectedIntake({
      id: data.id,
      formData: data.formData || {},
      patientName: data.patientName || "Patient",
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/doctor" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>
      <h1 className="section-heading">Intake submissions</h1>
      <p className="mt-2 text-gray-600">
        Review patient intake forms. Mark as reviewed when done.
      </p>

      {loading ? (
        <p className="mt-10 text-gray-500">Loading…</p>
      ) : intakes.length === 0 ? (
        <p className="mt-10 text-gray-500">No intake submissions yet.</p>
      ) : (
        <ul className="mt-10 space-y-3">
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
  );
}
