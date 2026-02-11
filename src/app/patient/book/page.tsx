"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BOOK_TYPE_SLUGS, slugToType } from "./types";

type AllowedType = { type: string; durationMinutes: number; label: string };

const SLUG_LABELS: Record<string, string> = {
  orientation: "Orientation consultation (30 min)",
  "clinical-intake": "Clinical Intake Appointment (60 min)",
  "followup-30": "Follow-up (med management, 30 min)",
  "followup-45": "Follow-up (med + therapy, 45 min)",
};

export default function PatientBookPage() {
  const [allowedTypes, setAllowedTypes] = useState<AllowedType[]>([]);
  const [notAllowedReasons, setNotAllowedReasons] = useState<Record<string, string>>({});
  const [pendingForms, setPendingForms] = useState<{ hasPendingForms: boolean; pendingCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [allowedRes, formsRes] = await Promise.all([
          fetch("/api/appointments/allowed-types", { credentials: "include" }),
          fetch("/api/patient-forms/check-pending", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (allowedRes.ok) {
          const data = await allowedRes.json();
          setAllowedTypes((data.allowedTypes || []) as AllowedType[]);
          setNotAllowedReasons((data.notAllowedReasons || {}) as Record<string, string>);
        }
        if (formsRes.ok) {
          const formsData = await formsRes.json();
          setPendingForms(formsData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/patient" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>
      <h1 className="section-heading">Book an appointment</h1>
      <p className="mt-2 text-gray-600">
        Choose the type of appointment you want to book. You’ll then pick a date and time.
      </p>

      {pendingForms?.hasPendingForms && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            You have {pendingForms.pendingCount} pending form{pendingForms.pendingCount === 1 ? "" : "s"} to complete before booking.
          </p>
          <Link href="/patient/forms" className="mt-2 inline-block text-sm font-medium text-amber-900 hover:underline">
            Complete forms →
          </Link>
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-gray-500">Loading…</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {BOOK_TYPE_SLUGS.map((slug) => {
            const backendType = slugToType(slug);
            const isAllowed = backendType ? allowedTypes.some((a) => a.type === backendType) : false;
            const reason = backendType ? notAllowedReasons[backendType] : "";
            const label = SLUG_LABELS[slug] ?? slug;

            return (
              <div
                key={slug}
                className={`rounded-xl border p-5 shadow-sm transition ${
                  isAllowed
                    ? "border-cream-200 bg-white hover:border-warm-brown/50 hover:shadow-md"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <h2 className="text-base font-semibold text-gray-900">{label}</h2>
                {isAllowed ? (
                  <Link
                    href={`/patient/book/${slug}`}
                    className="mt-3 inline-block rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
                  >
                    Book this appointment →
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-gray-500" title={reason}>
                    {reason || "Not available for you at this time."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link href="/patient" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </main>
  );
}
