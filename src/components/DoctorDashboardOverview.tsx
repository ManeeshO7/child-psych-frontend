"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type PatientRequest = {
  id: string;
  status: string;
  questionnaireData: Record<string, unknown> | null;
};

type DashboardAppointment = {
  id: string;
  scheduledAt: string;
  durationMinutes?: number;
  type: string;
  status: string;
  meetLink?: string | null;
  patient?: { id: string; name: string; email?: string };
};

const PRACTICE_TZ = "America/Los_Angeles";
const JOINABLE_STATUSES = ["scheduled", "card_on_file", "paid"];

function dateKeyInPracticeTz(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRACTICE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function formatTimeInPracticeTz(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Time TBD";
  return d.toLocaleTimeString("en-US", {
    timeZone: PRACTICE_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeRangeInPracticeTz(iso: string, durationMinutes?: number): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Time TBD";
  const start = formatTimeInPracticeTz(iso);
  const dur = typeof durationMinutes === "number" && durationMinutes > 0 ? durationMinutes : 30;
  const end = new Date(d.getTime() + dur * 60 * 1000);
  const endLabel = end.toLocaleTimeString("en-US", {
    timeZone: PRACTICE_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${start} - ${endLabel}`;
}

function typeLabel(type: string): string {
  if (type === "clinical_intake") return "Clinical intake appointment";
  if (type === "orientation_consult") return "Orientation consultation";
  if (type === "followup_med_30") return "Follow-up (30 min)";
  if (type === "followup_med_therapy_45") return "Follow-up (med + therapy, 45 min)";
  return type?.replaceAll("_", " ") || "Appointment";
}

export default function DoctorDashboardOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
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
        const allAppts: DashboardAppointment[] = Array.isArray(appointments) ? appointments : [];
        const now = new Date();
        const upcomingCount = allAppts.filter(
          (a) => a.status !== "cancelled" && new Date(a.scheduledAt) >= now
        ).length;
        setAppointmentCount(upcomingCount);
        setAppointments(allAppts);
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

  const todayKey = dateKeyInPracticeTz(new Date().toISOString());
  const todaysAppointments = appointments
    .filter((a) => a.status !== "cancelled" && dateKeyInPracticeTz(a.scheduledAt) === todayKey)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const todayLabel = new Date().toLocaleDateString("en-US", {
    timeZone: PRACTICE_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const statCards = [
    {
      href: "/doctor/requests",
      label: "Patient Requests",
      sublabel: "pending",
      value: pendingCount,
      desc: "Review and approve new patient access requests.",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      accent: "bg-amber-50 text-amber-600",
      badge: pendingCount !== null && pendingCount > 0,
    },
    {
      href: "/doctor/appointments",
      label: "Appointments",
      sublabel: "upcoming",
      value: appointmentCount,
      desc: "View your upcoming and past appointments.",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      accent: "bg-cta/10 text-cta",
      badge: false,
    },
    {
      href: "/doctor/patients",
      label: "Patients",
      sublabel: "active",
      value: patientCount,
      desc: "View patient details, appointments, and form submissions.",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      accent: "bg-violet-50 text-violet-600",
      badge: false,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-7 w-7 animate-spin text-cta" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-gray-500">Loading dashboard…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-400">{todayLabel}</p>
            <h1 className="mt-1 text-3xl font-bold text-navy">Doctor Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome back — here&apos;s your practice at a glance.</p>
          </div>
          {calendarConnected === true && (
            <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Google Calendar connected
            </div>
          )}
        </div>

        {/* Calendar banners */}
        {searchParams.get("calendar") === "connected" && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm text-green-800">
            <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Google Calendar connected. New bookings will get a unique Meet link.
          </div>
        )}
        {searchParams.get("calendar") === "error" && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-800">
            Could not connect Google Calendar. Please try again.
          </div>
        )}
        {calendarConnected === false && (
          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Connect Google Calendar</p>
              <p className="mt-0.5 text-sm text-amber-700">Each patient booking will automatically get a unique Google Meet link.</p>
              <a href="/api/auth/google" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition">
                Connect now
              </a>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative flex flex-col rounded-2xl border border-cream-200 bg-white p-6 shadow-sm transition hover:border-cta/30 hover:shadow-md"
            >
              {card.badge && (
                <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-md">
                  {card.value}
                </span>
              )}
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${card.accent}`}>
                {card.icon}
              </div>
              <p className="text-4xl font-bold text-navy">
                {card.value === null ? (
                  <span className="text-gray-300">—</span>
                ) : card.value}
              </p>
              <p className="text-sm text-gray-400">{card.sublabel}</p>
              <p className="mt-3 text-base font-semibold text-gray-700 group-hover:text-cta transition-colors">{card.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">{card.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-cta opacity-0 transition-opacity group-hover:opacity-100">
                View <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Today's appointments */}
        <section className="mt-6 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cta/10">
                <svg className="h-4 w-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Today&apos;s Appointments</h2>
                <p className="text-xs text-gray-400">{todaysAppointments.length} scheduled</p>
              </div>
            </div>
            <Link href="/doctor/appointments" className="text-xs font-medium text-cta hover:underline">
              View all →
            </Link>
          </div>

          {todaysAppointments.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-cream-300 bg-cream-50 py-8 text-center">
              <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-400">No appointments scheduled for today</p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {todaysAppointments.map((apt) => (
                <li
                  key={apt.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-200 bg-cream-50/60 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">
                      {apt.patient?.name || "Patient"}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {formatTimeRangeInPracticeTz(apt.scheduledAt, apt.durationMinutes)} &middot; {typeLabel(apt.type)}
                    </p>
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                      apt.status === "scheduled" ? "bg-cta/10 text-cta"
                      : apt.status === "paid" ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                    }`}>
                      {apt.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {apt.meetLink && JOINABLE_STATUSES.includes(apt.status) && (
                      <a
                        href={apt.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cta px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Join
                      </a>
                    )}
                    {apt.patient?.id && (
                      <Link
                        href={`/doctor/patients/${encodeURIComponent(apt.patient.id)}`}
                        className="inline-flex rounded-xl border border-cream-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-cream-50 transition"
                      >
                        View notes
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick actions */}
        <div className="mt-6">
          <Link
            href="/doctor/availability"
            className="group flex items-center justify-between rounded-2xl border border-cream-200 bg-white px-6 py-5 shadow-sm transition hover:border-cta/30 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-cta transition-colors">Manage Availability</p>
                <p className="text-xs text-gray-500">Set your available time blocks so patients can book appointments.</p>
              </div>
            </div>
            <svg className="h-4 w-4 text-gray-300 transition-colors group-hover:text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

      </div>
    </div>
  );
}
