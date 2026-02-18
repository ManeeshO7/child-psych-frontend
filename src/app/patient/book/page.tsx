"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { typeToSlug } from "./types";

type AllowedType = { type: string; durationMinutes: number; label: string };

const SLUG_LABELS: Record<string, string> = {
  orientation: "Orientation consultation (30 min)",
  "clinical-intake": "Clinical Intake Appointment (60 min)",
  "followup-30": "Follow-up (med management, 30 min)",
  "followup-45": "Follow-up (med + therapy, 45 min)",
};

export default function PatientBookPage() {
  const [allowedTypes, setAllowedTypes] = useState<AllowedType[]>([]);
  const [pendingForms, setPendingForms] = useState<{ hasPendingForms: boolean; pendingCount: number } | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
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
          setProfileComplete(data.profileComplete ?? null);
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

      {profileComplete === false && (
        <div className="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Complete your profile first before booking an appointment.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Please add Name, Sex, DOB, SSN, Contact info, and Preferred Pharmacy.
          </p>
          <Link
            href="/patient/profile"
            className="mt-3 inline-block rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
          >
            Complete profile →
          </Link>
        </div>
      )}
      {loading ? (
        <p className="mt-6 text-gray-500">Loading…</p>
      ) : allowedTypes.length === 0 ? (
        <div className="mt-8 rounded-lg border border-cream-200 bg-cream-50 p-6">
          <p className="text-gray-600">
            You don&apos;t have any bookable appointment types at this time.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {profileComplete === false
              ? "Complete your profile first to book an orientation consultation."
              : "New patients: request access first. After orientation, you can book clinical intake. After intake, your doctor will assign your follow-up type."}
          </p>
          <Link href="/patient" className="mt-4 inline-block text-warm-brown hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {allowedTypes.map((opt) => {
            const slug = typeToSlug(opt.type);
            if (!slug) return null;
            const labelAlreadyHasDuration = /\d+\s*min/i.test(opt.label);
            const label = labelAlreadyHasDuration ? opt.label : `${opt.label} (${opt.durationMinutes} min)`;
            return (
              <div
                key={opt.type}
                className="rounded-xl border border-cream-200 bg-white p-5 shadow-sm transition hover:border-warm-brown/50 hover:shadow-md"
              >
                <h2 className="text-base font-semibold text-gray-900">{label}</h2>
                <Link
                  href={`/patient/book/${slug}`}
                  className="mt-3 inline-block rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
                >
                  Book this appointment →
                </Link>
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
