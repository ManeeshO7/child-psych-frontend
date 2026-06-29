"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { typeToSlug } from "./types";

type AllowedType = { type: string; durationMinutes: number; label: string };

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
    <div className="min-h-screen bg-cream-50/60">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Back link */}
        <Link href="/patient" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cta transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to dashboard
        </Link>

        {/* Page heading */}
        <div className="mt-6">
          <h1 className="text-3xl font-bold text-navy">Book an appointment</h1>
          <p className="mt-2 text-gray-500">
            Choose the type of appointment you want to book. You&apos;ll then pick a date and time.
          </p>
        </div>

        {/* Pending forms banner */}
        {pendingForms?.hasPendingForms && (
          <div className="mt-6 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                {pendingForms.pendingCount} pending form{pendingForms.pendingCount === 1 ? "" : "s"} to complete
              </p>
              <p className="mt-0.5 text-sm text-amber-800">Please complete your assigned forms before booking a new appointment.</p>
              <Link href="/patient/forms" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
                Complete forms
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Profile incomplete banner */}
        {profileComplete === false && (
          <div className="mt-6 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-900">Complete your profile first</p>
              <p className="mt-0.5 text-sm text-amber-800">
                Please add your Name, Sex, Date of Birth, SSN, Contact info, and Preferred Pharmacy before booking.
              </p>
              <Link href="/patient/profile" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
                Complete profile
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Appointment type list */}
        {loading ? (
          <div className="mt-8 flex items-center gap-3 text-gray-400">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading appointment types…
          </div>
        ) : allowedTypes.length === 0 ? (
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-cream-300 bg-white p-6 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v3m10.5-3v3M3.75 9.75h16.5M5.25 6.75h13.5A1.5 1.5 0 0120.25 8.25v11.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-navy">No bookable appointments available</p>
              <p className="mt-1 text-sm text-gray-500">
                {profileComplete === false
                  ? "Complete your profile first to book an orientation consultation."
                  : "New patients: request access first. After orientation, you can book clinical intake. After intake, your doctor will assign your follow-up type."}
              </p>
              <Link href="/patient" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cta hover:underline">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to dashboard
              </Link>
            </div>
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
                  className="group flex items-center justify-between overflow-hidden rounded-2xl border border-cream-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cta/40 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v3m10.5-3v3M3.75 9.75h16.5M5.25 6.75h13.5A1.5 1.5 0 0120.25 8.25v11.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5z" />
                      </svg>
                    </div>
                    <h2 className="text-base font-semibold text-navy">{label}</h2>
                  </div>
                  <Link
                    href={`/patient/book/${slug}`}
                    className="ml-4 shrink-0 rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white transition hover:bg-cta/90"
                  >
                    Book →
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
    </div>
  );
}
