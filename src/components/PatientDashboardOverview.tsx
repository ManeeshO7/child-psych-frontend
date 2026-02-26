"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RescheduleModal from "@/components/RescheduleModal";

type IntakeResponse =
  | null
  | {
      status?: "draft" | "submitted" | "reviewed" | string;
    };

type DashboardAppointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  type: string;
  status: string;
  doctor?: { id: string; email: string; name: string };
  meetLink?: string | null;
  hasPendingFormsForThisAppointment?: boolean;
};

type CardSummary = {
  hasCard: boolean;
  brand?: string | null;
  last4?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
};

type PaymentHistoryItem = {
  id?: string | null;
  status?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  createdAt?: string | null;
  description?: string | null;
  receiptUrl?: string | null;
  invoicePdfUrl?: string | null;
  hostedInvoiceUrl?: string | null;
};

const PRACTICE_TZ = "America/Los_Angeles";
const RESCHEDULABLE_STATUSES = ["scheduled", "card_on_file", "paid"];
const RESCHEDULE_MIN_HOURS = 48;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function formatAppointmentDateTime(iso: string): string {
  try {
    if (!iso) return "Date TBD";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleString("en-US", {
      timeZone: PRACTICE_TZ,
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
    });
  } catch {
    return "Date error";
  }
}

function typeLabel(type: string): string {
  if (type === "clinical_intake") return "Clinical intake";
  if (type === "orientation_consult") return "Orientation consult";
  if (type === "followup_med_30") return "Follow-up (30 min)";
  if (type === "followup_med_therapy_45") return "Follow-up (45 min)";
  return type;
}

function canReschedule(a: { scheduledAt: string; status: string }): boolean {
  if (!RESCHEDULABLE_STATUSES.includes(a.status)) return false;
  try {
    const scheduledAt = new Date(a.scheduledAt);
    if (isNaN(scheduledAt.getTime())) return false;
    const now = new Date();
    const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= RESCHEDULE_MIN_HOURS;
  } catch {
    return false;
  }
}

function formatSessionRemaining(msRemaining: number): string {
  if (msRemaining <= 0) return "Expired";
  const totalMinutes = Math.floor(msRemaining / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function PatientDashboardOverview() {
  const router = useRouter();
  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
  } | null>(null);
  const [fullProfile, setFullProfile] = useState<{
    profile: {
      sex?: string | null;
      dateOfBirth?: string | null;
      ssn?: string | null;
      address?: string | null;
      preferredPharmacyName?: string | null;
      preferredPharmacyPhone?: string | null;
      preferredPharmacyAddress?: string | null;
      guardian1Name?: string | null;
      guardian1Relationship?: string | null;
      guardian1Phone?: string | null;
      guardian2Name?: string | null;
      guardian2Relationship?: string | null;
      guardian2Phone?: string | null;
    } | null;
    user?: { firstName?: string; lastName?: string; phone?: string | null; email?: string };
  } | null>(null);
  const [hasAssignedForms, setHasAssignedForms] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<DashboardAppointment[]>([]);
  const [pendingFormsCheck, setPendingFormsCheck] = useState<{
    hasPendingForms: boolean;
    pendingCount: number;
  } | null>(null);
  const [cardSummary, setCardSummary] = useState<CardSummary | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [lastLoginIso, setLastLoginIso] = useState<string | null>(null);
  const [sessionExpiresAtMs, setSessionExpiresAtMs] = useState<number | null>(null);
  const [sessionLastActivityAtMs, setSessionLastActivityAtMs] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [changeTimeAppointment, setChangeTimeAppointment] = useState<DashboardAppointment | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const lastNavAtRef = useRef(0);
  const NAV_THROTTLE_MS = 1500;

  function handleNav(e: React.MouseEvent, path: string) {
    e.preventDefault();
    const now = Date.now();
    if (now - lastNavAtRef.current < NAV_THROTTLE_MS) return;
    lastNavAtRef.current = now;
    router.push(path);
  }

  async function refreshData() {
    try {
      const [appRes, meRes, formsRes, pendingRes, profileRes, cardRes, historyRes, sessionRes, msgSummaryRes] = await Promise.all([
        fetch("/api/appointments/", { credentials: "include" }),
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/patient-forms/my-forms", { credentials: "include" }),
        fetch("/api/patient-forms/check-pending", { credentials: "include" }),
        fetch("/api/patient-profile/", { credentials: "include" }),
        fetch("/api/payments/payment-method", { credentials: "include" }),
        fetch("/api/payments/history?limit=5", { credentials: "include" }),
        fetch("/api/auth/session", { credentials: "include" }),
        fetch("/api/messages/summary", { credentials: "include" }),
      ]);
      if (appRes.status === 401 || meRes.status === 401) {
        router.push("/login");
        return;
      }
      const apps = await appRes.json();
      const me = await meRes.json().catch(() => null);
      const forms = formsRes.ok ? await formsRes.json().catch(() => []) : [];
      const appList = Array.isArray(apps) ? apps : [];
      setAppointmentCount(appList.length);
      setAppointments(appList as DashboardAppointment[]);
      setPendingAppointments(
        appList.filter(
          (a: { status?: string }) => a.status === "pending_confirmation"
        ) as DashboardAppointment[]
      );
      setProfile(me && typeof me === "object" ? me : null);
      setHasAssignedForms(Array.isArray(forms) && forms.length > 0);
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json().catch(() => null);
        setPendingFormsCheck(pendingData);
      }
      if (profileRes.ok) {
        const profileData = await profileRes.json().catch(() => null);
        setFullProfile(profileData);
        setProfileComplete(profileData?.isComplete ?? null);
      }
      if (cardRes.ok) {
        const cardData = await cardRes.json().catch(() => null);
        setCardSummary(cardData && typeof cardData === "object" ? cardData as CardSummary : null);
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json().catch(() => null);
        const items = Array.isArray(historyData?.items) ? historyData.items : [];
        setPaymentHistory(items as PaymentHistoryItem[]);
      }
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json().catch(() => null);
        const iat = typeof sessionData?.iat === "number" ? sessionData.iat : null;
        const exp = typeof sessionData?.exp === "number" ? sessionData.exp : null;
        const lat = typeof sessionData?.lat === "number" ? sessionData.lat : null;
        if (iat) setLastLoginIso(new Date(iat * 1000).toISOString());
        if (exp) setSessionExpiresAtMs(exp * 1000);
        if (lat) setSessionLastActivityAtMs(lat * 1000);
      }
      if (msgSummaryRes.ok) {
        const msgData = await msgSummaryRes.json().catch(() => null);
        setUnreadMessages(typeof msgData?.unreadCount === "number" ? msgData.unreadCount : 0);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [appRes, meRes, formsRes, pendingRes, profileRes, cardRes, historyRes, sessionRes, msgSummaryRes] = await Promise.all([
          fetch("/api/appointments/", { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
          fetch("/api/patient-forms/my-forms", { credentials: "include" }),
          fetch("/api/patient-forms/check-pending", { credentials: "include" }),
          fetch("/api/patient-profile/", { credentials: "include" }),
          fetch("/api/payments/payment-method", { credentials: "include" }),
          fetch("/api/payments/history?limit=5", { credentials: "include" }),
          fetch("/api/auth/session", { credentials: "include" }),
          fetch("/api/messages/summary", { credentials: "include" }),
        ]);
        if (appRes.status === 401 || meRes.status === 401) {
          router.push("/login");
          return;
        }
        if (cancelled) return;
        const apps = await appRes.json();
        const me = await meRes.json().catch(() => null);
        const forms = formsRes.ok ? await formsRes.json().catch(() => []) : [];
        const appList = Array.isArray(apps) ? apps : [];
        setAppointmentCount(appList.length);
        setAppointments(appList as DashboardAppointment[]);
        setPendingAppointments(
          appList.filter(
            (a: { status?: string }) => a.status === "pending_confirmation"
          ) as DashboardAppointment[]
        );
        setProfile(me && typeof me === "object" ? me : null);
        setHasAssignedForms(Array.isArray(forms) && forms.length > 0);
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json().catch(() => null);
          setPendingFormsCheck(pendingData);
        }
        if (profileRes.ok) {
          const profileData = await profileRes.json().catch(() => null);
          setFullProfile(profileData);
          setProfileComplete(profileData?.isComplete ?? null);
        }
        if (cardRes.ok) {
          const cardData = await cardRes.json().catch(() => null);
          setCardSummary(cardData && typeof cardData === "object" ? cardData as CardSummary : null);
        }
        if (historyRes.ok) {
          const historyData = await historyRes.json().catch(() => null);
          const items = Array.isArray(historyData?.items) ? historyData.items : [];
          setPaymentHistory(items as PaymentHistoryItem[]);
        }
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json().catch(() => null);
          const iat = typeof sessionData?.iat === "number" ? sessionData.iat : null;
          const exp = typeof sessionData?.exp === "number" ? sessionData.exp : null;
          const lat = typeof sessionData?.lat === "number" ? sessionData.lat : null;
          if (iat) setLastLoginIso(new Date(iat * 1000).toISOString());
          if (exp) setSessionExpiresAtMs(exp * 1000);
          if (lat) setSessionLastActivityAtMs(lat * 1000);
        }
        if (msgSummaryRes.ok) {
          const msgData = await msgSummaryRes.json().catch(() => null);
          setUnreadMessages(typeof msgData?.unreadCount === "number" ? msgData.unreadCount : 0);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const id = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  const firstName = (profile?.firstName || fullProfile?.user?.firstName || "there").trim();
  const upcomingAppointments = appointments
    .filter((a) => {
      if (!a?.scheduledAt) return false;
      const d = new Date(a.scheduledAt);
      if (isNaN(d.getTime())) return false;
      const isUpcomingStatus = ["pending_confirmation", "scheduled", "card_on_file", "paid"].includes(a.status);
      return isUpcomingStatus && d.getTime() >= Date.now();
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const nextAppointment = upcomingAppointments[0] ?? null;
  const nextNeedsForms =
    nextAppointment?.status === "pending_confirmation" && nextAppointment.hasPendingFormsForThisAppointment === true;
  const idleRemainingMs = sessionLastActivityAtMs
    ? (sessionLastActivityAtMs + SESSION_IDLE_TIMEOUT_MS) - clockNow
    : null;
  const sessionRemainingMs =
    idleRemainingMs !== null
      ? idleRemainingMs
      : (sessionExpiresAtMs ? sessionExpiresAtMs - clockNow : null);
  const sessionWarning = typeof sessionRemainingMs === "number" && sessionRemainingMs > 0 && sessionRemainingMs <= 30 * 60 * 1000;
  const lastLoginLabel = lastLoginIso
    ? new Date(lastLoginIso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "Unavailable";
  const tileClass =
    "card flex flex-col gap-3 rounded-[20px] bg-white p-7 shadow-sm ring-1 ring-warm-brown/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";
  const tileTitleClass = "text-xl font-semibold text-warm-brown";
  const tileDescriptionClass = "text-base text-gray-600";
  const tileLinkClass = "text-sm font-medium text-warm-brown";

  return (
    <main className="relative mx-auto max-w-6xl overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-warm-tan/25 via-warm-beige/20 to-transparent blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-20 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-100/30 via-cream-100/20 to-transparent blur-3xl"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="section-heading text-3xl md:text-4xl">Dashboard</h1>
          <p className="mt-3 text-base text-gray-600">
            Manage your profile and appointments.
          </p>
        </div>
        <div className={`min-w-[250px] rounded-xl border px-4 py-3 text-sm ${
          sessionWarning
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-cream-200 bg-white/90 text-gray-700"
        }`}>
          <p><span className="font-medium text-gray-900">Last login:</span> {lastLoginLabel}</p>
          <p className="mt-1">
            <span className="font-medium text-gray-900">Session timeout:</span>{" "}
            {typeof sessionRemainingMs === "number" ? `in ${formatSessionRemaining(sessionRemainingMs)}` : "Unavailable"}
          </p>
        </div>
      </div>

      <div className="mt-8 card rounded-[20px] bg-white p-7 shadow-md shadow-warm-brown/5 ring-1 ring-warm-brown/10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-warm-brown">Welcome back, {firstName}</h2>
            <p className="mt-1 text-sm text-gray-600">You are doing great. Here is your next step.</p>
          </div>
          <div aria-hidden className="hidden shrink-0 md:block">
            <svg viewBox="0 0 160 120" className="h-24 w-32 text-warm-brown/30" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 90c14-30 34-45 60-45 20 0 38 9 56 26" strokeLinecap="round" />
              <path d="M46 84c10-20 22-30 36-30 10 0 21 5 32 14" strokeLinecap="round" />
              <circle cx="34" cy="36" r="10" fill="currentColor" fillOpacity="0.14" stroke="none" />
              <circle cx="70" cy="24" r="7" fill="currentColor" fillOpacity="0.12" stroke="none" />
              <circle cx="106" cy="40" r="9" fill="currentColor" fillOpacity="0.1" stroke="none" />
            </svg>
          </div>
        </div>
        {nextAppointment ? (
          <>
            <p className="mt-4 text-base text-gray-700">
              Your next appointment is on{" "}
              <span className="font-medium text-gray-900">
                {formatAppointmentDateTime(nextAppointment.scheduledAt)}
              </span>
              {" "}({typeLabel(nextAppointment.type)}).
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {nextAppointment.status === "pending_confirmation" ? (
                nextNeedsForms ? (
                  <Link
                    href="/patient/forms"
                    className="inline-flex items-center rounded-lg bg-warm-brown px-4 py-2.5 text-sm font-medium text-white hover:bg-warm-brown/90"
                  >
                    Complete forms first
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/patient/confirm-scheduled?appointmentId=${encodeURIComponent(nextAppointment.id)}`}
                      className="inline-flex items-center rounded-lg bg-warm-brown px-4 py-2.5 text-sm font-medium text-white hover:bg-warm-brown/90"
                    >
                      Confirm & add payment
                    </Link>
                    <button
                      type="button"
                      onClick={() => setChangeTimeAppointment(nextAppointment)}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Change time
                    </button>
                  </>
                )
              ) : (
                <>
                  {nextAppointment.meetLink && (
                    <a
                      href={nextAppointment.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg bg-warm-brown px-4 py-2.5 text-sm font-medium text-white hover:bg-warm-brown/90"
                    >
                      Join appointment
                    </a>
                  )}
                  {canReschedule(nextAppointment) && (
                    <button
                      type="button"
                      onClick={() => setChangeTimeAppointment(nextAppointment)}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Reschedule
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <p className="mt-4 text-base text-gray-700">You have no upcoming appointments.</p>
        )}
      </div>

      <div aria-hidden className="mt-6">
        <svg viewBox="0 0 1200 70" className="h-6 w-full text-warm-brown/10" preserveAspectRatio="none">
          <path
            d="M0,30 C150,55 300,5 450,30 C600,55 750,5 900,30 C1020,48 1110,34 1200,20 L1200,70 L0,70 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {profileComplete === false && (
        <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800" aria-hidden>
              !
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-amber-900">Complete your profile first</h2>
              <p className="mt-2 text-base text-amber-800">
                To book your 30-minute orientation consultation, please complete your profile (Name, Sex, DOB, SSN, Contact info, Preferred Pharmacy, and optional Guardian info).
              </p>
              <Link
                href="/patient/profile"
                className="mt-4 inline-flex rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
              >
                Complete profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      {pendingAppointments.length > 0 && (
        <div className="mt-8 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800" aria-hidden>
              !
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-amber-900">
                Action required — Confirm your appointment
              </h2>
              <p className="mt-2 text-base text-amber-800">
                Your doctor has scheduled an appointment for you. Please confirm to add payment and secure your time.
              </p>
              <ul className="mt-4 space-y-3">
                {pendingAppointments.map((a) => {
                  const mustCompleteForms = a.hasPendingFormsForThisAppointment === true;
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/60 bg-white/95 p-5"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatAppointmentDateTime(a.scheduledAt)} · {typeLabel(a.type)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {a.durationMinutes} minutes
                        </p>
                        {mustCompleteForms && (
                          <p className="mt-2 text-sm font-medium text-amber-800">
                            Complete your assigned forms before confirming.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {mustCompleteForms ? (
                          <Link
                            href="/patient/forms"
                            className="inline-flex items-center rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
                          >
                            Complete forms first
                          </Link>
                        ) : (
                          <>
                            <Link
                              href={`/patient/confirm-scheduled?appointmentId=${encodeURIComponent(a.id)}`}
                              className="inline-flex items-center rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
                            >
                              Confirm & add payment
                            </Link>
                            <button
                              type="button"
                              onClick={() => setChangeTimeAppointment(a)}
                              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Change time
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/patient/profile"
          onClick={(e) => handleNav(e, "/patient/profile")}
          className={`${tileClass} cursor-pointer`}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warm-brown/10 text-warm-brown">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
              </svg>
            </span>
            <h2 className={tileTitleClass}>My Profile</h2>
          </div>
          <p className={tileDescriptionClass}>Your profile details.</p>
          <p className="mt-2 text-base font-medium text-gray-900">
            {(profile?.firstName || fullProfile?.user?.firstName || "—")}{" "}
            {(profile?.lastName || fullProfile?.user?.lastName || "")}
          </p>
          {profileComplete === false && (
            <p className="text-xs text-amber-700">Profile incomplete — complete to book orientation.</p>
          )}
          <p className={`mt-auto ${tileLinkClass}`}>View profile →</p>
        </a>

        <div className={tileClass}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warm-brown/10 text-warm-brown">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v3m10.5-3v3M3.75 9.75h16.5M5.25 6.75h13.5A1.5 1.5 0 0 1 20.25 8.25v11.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5Z" />
              </svg>
            </span>
            <h2 className={tileTitleClass}>Upcoming Visit</h2>
          </div>
          {nextAppointment ? (
            <>
              <p className="mt-1 pt-0.5 text-base font-medium leading-7 text-gray-900">
                {formatAppointmentDateTime(nextAppointment.scheduledAt)}
              </p>
              <p className={tileDescriptionClass}>
                {nextAppointment.durationMinutes} min · {typeLabel(nextAppointment.type)}
              </p>
              <p className={tileDescriptionClass}>
                {nextAppointment.doctor?.name ? `Dr. ${nextAppointment.doctor.name}` : "Doctor assigned"}
                {" · "}
                {nextAppointment.meetLink ? "Virtual" : "In person"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {nextAppointment.status === "pending_confirmation" ? (
                  nextNeedsForms ? (
                    <Link
                      href="/patient/forms"
                      className="inline-flex items-center rounded-lg bg-warm-brown px-3 py-1.5 text-sm font-medium text-white hover:bg-warm-brown/90"
                    >
                      Complete forms first
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/patient/confirm-scheduled?appointmentId=${encodeURIComponent(nextAppointment.id)}`}
                        className="inline-flex items-center rounded-lg bg-warm-brown px-3 py-1.5 text-sm font-medium text-white hover:bg-warm-brown/90"
                      >
                        Confirm & add payment
                      </Link>
                      <button
                        type="button"
                        onClick={() => setChangeTimeAppointment(nextAppointment)}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Change time
                      </button>
                    </>
                  )
                ) : (
                  <>
                    {nextAppointment.meetLink && (
                      <a
                        href={nextAppointment.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-lg bg-warm-brown px-3 py-1.5 text-sm font-medium text-white hover:bg-warm-brown/90"
                      >
                        Join
                      </a>
                    )}
                    {canReschedule(nextAppointment) && (
                      <button
                        type="button"
                        onClick={() => setChangeTimeAppointment(nextAppointment)}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Reschedule
                      </button>
                    )}
                  </>
                )}
              </div>
              <p className={`mt-auto ${tileLinkClass}`}>
                <Link href="/patient/appointments" className="hover:underline">
                  View all appointments →
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className={tileDescriptionClass}>No upcoming appointments right now.</p>
              <p className={`mt-auto ${tileLinkClass}`}>
                <Link href="/patient/book" className="hover:underline">
                  Book appointment →
                </Link>
              </p>
            </>
          )}
          {appointmentCount !== null && (
            <p className="text-sm text-gray-500">{appointmentCount} total appointments</p>
          )}
        </div>

        <div className={tileClass}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warm-brown/10 text-warm-brown">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5m-18 0v9A2.25 2.25 0 0 0 6 19.5h12a2.25 2.25 0 0 0 2.25-2.25v-9m-16.5 0V6.75A2.25 2.25 0 0 1 6 4.5h12a2.25 2.25 0 0 1 2.25 2.25v1.5" />
              </svg>
            </span>
            <h2 className={tileTitleClass}>Billing & Payments</h2>
          </div>
          <p className={tileDescriptionClass}>Payment history, invoices, and card on file.</p>
          {cardSummary?.hasCard ? (
            <p className="text-base text-gray-900">
              Card on file: {(cardSummary.brand || "Card").toString().toUpperCase()} •••• {cardSummary.last4 || "—"}
            </p>
          ) : (
            <p className="text-base text-gray-600">Card on file: none</p>
          )}
            <p className={tileDescriptionClass}>
            {paymentHistory.length > 0 ? `${paymentHistory.length} recent payment${paymentHistory.length === 1 ? "" : "s"} available.` : "No payment history yet."}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-3">
            <Link href="/patient/billing" className={`${tileLinkClass} hover:underline`}>
              View invoices →
            </Link>
            <Link href="/patient/save-card?returnTo=/patient" className={`${tileLinkClass} hover:underline`}>
              {cardSummary?.hasCard ? "Manage card →" : "Add card →"}
            </Link>
          </div>
        </div>

        <a
          href="/patient/messages"
          onClick={(e) => handleNav(e, "/patient/messages")}
          className={`${tileClass} cursor-pointer`}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warm-brown/10 text-warm-brown">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 1.66-1.79 3-4 3H9l-4 4v-4c-1.11 0-2-.67-2-1.5V6c0-.83.89-1.5 2-1.5h12c2.21 0 4 1.34 4 3v4.5Z" />
              </svg>
            </span>
            <h2 className={tileTitleClass}>Messages</h2>
          </div>
          <p className={tileDescriptionClass}>
            {unreadMessages > 0
              ? `You have ${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}.`
              : "No unread messages."}
          </p>
          <p className={`mt-auto ${tileLinkClass}`}>Open Inbox →</p>
        </a>

        {hasAssignedForms && (
          <a
            href="/patient/forms"
            onClick={(e) => handleNav(e, "/patient/forms")}
            className={`${tileClass} cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warm-brown/10 text-warm-brown">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-8.625a1.125 1.125 0 0 0-1.125-1.125H8.25m11.25 9.75-3-3m3 3-3 3m-2.25-12h-6A1.125 1.125 0 0 0 7.125 6.375v11.25A1.125 1.125 0 0 0 8.25 18.75h8.625A1.125 1.125 0 0 0 18 17.625V9.75a1.125 1.125 0 0 0-.33-.795l-3.375-3.375A1.125 1.125 0 0 0 13.5 5.25Z" />
                </svg>
              </span>
              <h2 className={tileTitleClass}>Forms & Documents</h2>
            </div>
            <p className={tileDescriptionClass}>
              Complete forms assigned by your doctor.
            </p>
            <p className={`mt-auto ${tileLinkClass}`}>View forms →</p>
          </a>
        )}

        <a
          href="/patient/book"
          onClick={(e) => handleNav(e, "/patient/book")}
          className={`${tileClass} cursor-pointer`}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-warm-brown/10 text-warm-brown">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </span>
            <h2 className={tileTitleClass}>Book appointment</h2>
          </div>
          <p className={tileDescriptionClass}>
            Request a follow-up appointment time.
          </p>
          <p className={`mt-auto ${tileLinkClass}`}>Request follow-up →</p>
        </a>
      </div>

      <RescheduleModal
        isOpen={!!changeTimeAppointment}
        onClose={() => setChangeTimeAppointment(null)}
        appointmentId={changeTimeAppointment?.id ?? ""}
        durationMinutes={changeTimeAppointment?.durationMinutes ?? 30}
        appointmentType={changeTimeAppointment?.type}
        variant={changeTimeAppointment?.status === "pending_confirmation" ? "change-proposed-time" : "reschedule"}
        onSuccess={() => {
          setChangeTimeAppointment(null);
          refreshData();
        }}
      />
    </main>
  );
}

