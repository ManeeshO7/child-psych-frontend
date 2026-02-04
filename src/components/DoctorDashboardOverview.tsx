"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PatientRequest = {
  id: string;
  status: string;
  questionnaireData: Record<string, unknown> | null;
};

export default function DoctorDashboardOverview() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [intakeCount, setIntakeCount] = useState<number | null>(null);
  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [reqRes, intRes, appRes] = await Promise.all([
          fetch("/api/patient-requests/", { credentials: "include" }),
          fetch("/api/intake/all", { credentials: "include" }),
          fetch("/api/appointments/", { credentials: "include" }),
        ]);
        if (reqRes.status === 401 || intRes.status === 401 || appRes.status === 401) {
          router.push("/doctor/login");
          return;
        }
        if (cancelled) return;
        const requests: PatientRequest[] = await reqRes.json();
        const intakes = await intRes.json();
        const appointments = await appRes.json();
        const pending = requests.filter(
          (r) =>
            r.status === "pending" &&
            r.questionnaireData != null &&
            Object.keys(r.questionnaireData).length > 0
        );
        setPendingCount(pending.length);
        setIntakeCount(Array.isArray(intakes) ? intakes.length : 0);
        setAppointmentCount(Array.isArray(appointments) ? appointments.length : 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
        Review patient requests, intake forms, and appointments.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/doctor/requests"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Patient Requests</h2>
          <p className="text-sm text-gray-600">
            Review new patient access requests. Approve to create their account and send login credentials; reject to decline.
          </p>
          <p className="mt-auto text-2xl font-bold text-gray-900">
            {pendingCount === null ? "—" : pendingCount}
          </p>
          <p className="text-xs text-gray-500">pending</p>
        </Link>

        <Link
          href="/doctor/intakes"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Intake submissions</h2>
          <p className="text-sm text-gray-600">
            Review patient intake forms. Mark as reviewed when done.
          </p>
          <p className="mt-auto text-2xl font-bold text-gray-900">
            {intakeCount === null ? "—" : intakeCount}
          </p>
          <p className="text-xs text-gray-500">submissions</p>
        </Link>

        <Link
          href="/doctor/appointments"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Appointments</h2>
          <p className="text-sm text-gray-600">
            Your upcoming and past appointments.
          </p>
          <p className="mt-auto text-2xl font-bold text-gray-900">
            {appointmentCount === null ? "—" : appointmentCount}
          </p>
          <p className="text-xs text-gray-500">appointments</p>
        </Link>
      </div>
    </main>
  );
}
