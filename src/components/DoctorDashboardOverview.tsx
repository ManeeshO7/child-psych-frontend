"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type PatientRequest = {
  id: string;
  status: string;
  questionnaireData: Record<string, unknown> | null;
};

export default function DoctorDashboardOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [reqRes, appRes, calRes, patientsRes] = await Promise.all([
          fetch("/api/patient-requests/", { credentials: "include" }),
          fetch("/api/appointments/", { credentials: "include" }),
          fetch("/api/auth/calendar-status", { credentials: "include" }),
          fetch("/api/patient-forms/patients", { credentials: "include" }),
        ]);
        if (reqRes.status === 401 || appRes.status === 401) {
          router.push("/doctor/login");
          return;
        }
        if (cancelled) return;
        const requests: PatientRequest[] = await reqRes.json();
        const appointments = await appRes.json();
        const patientsData = patientsRes.ok ? await patientsRes.json() : {};
        const pending = requests.filter(
          (r) =>
            r.status === "pending" &&
            r.questionnaireData != null &&
            Object.keys(r.questionnaireData).length > 0
        );
        setPendingCount(pending.length);
        setAppointmentCount(Array.isArray(appointments) ? appointments.length : 0);
        const count =
          typeof patientsData.total === "number"
            ? patientsData.total
            : Array.isArray(patientsData.patients)
              ? patientsData.patients.length
              : 0;
        setPatientCount(count);
        if (calRes.ok) {
          const cal = await calRes.json();
          setCalendarConnected(cal.connected === true);
        } else {
          setCalendarConnected(false);
        }
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
        Review patient requests and appointments.
      </p>

      {searchParams.get("calendar") === "connected" && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Google Calendar connected. New bookings will get a unique Meet link.
        </div>
      )}
      {searchParams.get("calendar") === "error" && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not connect Google Calendar. Please try again or set DEFAULT_MEET_LINK in the server environment.
        </div>
      )}

      {calendarConnected === false && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Connect Google Calendar</p>
          <p className="mt-1 text-sm text-amber-700">
            When patients book, they get a unique video meeting link. Connect your Google account to create a new Meet link for each appointment.
          </p>
          <a
            href="/api/auth/google"
            className="mt-3 inline-block rounded bg-warm-brown px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Connect Google Calendar
          </a>
        </div>
      )}
      {calendarConnected === true && (
        <p className="mt-4 text-sm text-green-700">Google Calendar connected — new Meet links are created for each booking.</p>
      )}

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

        <Link
          href="/doctor/patients"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Patients</h2>
          <p className="text-sm text-gray-600">
            View all patients, their details, appointments, and form submissions.
          </p>
          <p className="mt-auto text-2xl font-bold text-gray-900">
            {patientCount === null ? "—" : patientCount}
          </p>
          <p className="text-xs text-gray-500">patients</p>
        </Link>

        <Link
          href="/doctor/availability"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Manage availability</h2>
          <p className="text-sm text-gray-600">
            Set your available blocks for the next 7 days. Patients book 30-minute slots within these times.
          </p>
        </Link>
      </div>
    </main>
  );
}
