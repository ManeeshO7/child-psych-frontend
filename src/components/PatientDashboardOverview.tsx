"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type IntakeResponse =
  | null
  | {
      status?: "draft" | "submitted" | "reviewed" | string;
    };

export default function PatientDashboardOverview() {
  const router = useRouter();
  const [intakeStatus, setIntakeStatus] = useState<string | null>(null);
  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [intRes, appRes] = await Promise.all([
          fetch("/api/intake", { credentials: "include" }),
          fetch("/api/appointments/", { credentials: "include" }),
        ]);
        if (intRes.status === 401 || appRes.status === 401) {
          router.push("/login");
          return;
        }
        if (cancelled) return;
        const intake: IntakeResponse = await intRes.json();
        const apps = await appRes.json();
        setIntakeStatus(intake?.status ?? "not_started");
        setAppointmentCount(Array.isArray(apps) ? apps.length : 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const intakeLabel = useMemo(() => {
    if (!intakeStatus || intakeStatus === "not_started") return "Not started";
    if (intakeStatus === "draft") return "Draft";
    if (intakeStatus === "submitted") return "Submitted";
    if (intakeStatus === "reviewed") return "Reviewed";
    return intakeStatus;
  }, [intakeStatus]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="section-heading">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Manage your intake form and appointments.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/patient/intake"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Intake form</h2>
          <p className="text-sm text-gray-600">
            Complete your clinical intake. You can save a draft and return later.
          </p>
          <p className="mt-auto text-2xl font-bold text-gray-900">{intakeLabel}</p>
          <p className="text-xs text-gray-500">status</p>
        </Link>

        <Link
          href="/patient/appointments"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Appointments</h2>
          <p className="text-sm text-gray-600">
            View upcoming and past appointments.
          </p>
          <p className="mt-auto text-2xl font-bold text-gray-900">
            {appointmentCount === null ? "—" : appointmentCount}
          </p>
          <p className="text-xs text-gray-500">appointments</p>
        </Link>

        <Link
          href="/patient/book"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Book appointment</h2>
          <p className="text-sm text-gray-600">
            Request a follow-up appointment time.
          </p>
          <p className="mt-auto text-sm font-medium text-warm-brown">Request now →</p>
        </Link>
      </div>
    </main>
  );
}

