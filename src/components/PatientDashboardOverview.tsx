"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RescheduleModal from "@/components/RescheduleModal";
import ConfirmCancelModal from "@/components/ConfirmCancelModal";

type DashboardAppointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  type: string;
  status: string;
  doctor?: { id: string; email: string; name: string };
  meetLink?: string | null;
  hasPendingFormsForThisAppointment?: boolean;
  patientRescheduleCount?: number;
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

function canReschedule(a: {
  scheduledAt: string;
  status: string;
  patientRescheduleCount?: number;
}): boolean {
  if (!RESCHEDULABLE_STATUSES.includes(a.status)) return false;
  if ((a.patientRescheduleCount ?? 0) >= 1) return false;
  try {
    const scheduledAt = new Date(a.scheduledAt);
    if (isNaN(scheduledAt.getTime())) return false;
    return scheduledAt > new Date();
  } catch {
    return false;
  }
}

function canCancel(a: { scheduledAt: string; status: string }): boolean {
  const cancelableStatuses = ["scheduled", "card_on_file", "paid"];
  if (!cancelableStatuses.includes(a.status)) return false;
  try {
    const scheduledAt = new Date(a.scheduledAt);
    if (isNaN(scheduledAt.getTime())) return false;
    return scheduledAt > new Date();
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
    intakeConfirmed?: boolean;
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
  const [lastLoginIso, setLastLoginIso] = useState<string | null>(null);
  const [sessionExpiresAtMs, setSessionExpiresAtMs] = useState<number | null>(null);
  const [sessionLastActivityAtMs, setSessionLastActivityAtMs] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(true);
  const [changeTimeAppointment, setChangeTimeAppointment] = useState<DashboardAppointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; label: string } | null>(null);
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

  function openCancelConfirm(appointment: DashboardAppointment) {
    const label = `${formatAppointmentDateTime(appointment.scheduledAt)} · ${typeLabel(appointment.type)}`;
    setCancelTarget({ id: appointment.id, label });
  }

  async function confirmCancelAppointment() {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) {
      refreshData();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "Failed to cancel appointment.");
    }
  }

  async function refreshData() {
    try {
      const [appRes, meRes, formsRes, pendingRes, profileRes, cardRes, historyRes, sessionRes] = await Promise.all([
        fetch("/api/appointments/", { credentials: "include" }),
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/patient-forms/my-forms", { credentials: "include" }),
        fetch("/api/patient-forms/check-pending", { credentials: "include" }),
        fetch("/api/patient-profile/", { credentials: "include" }),
        fetch("/api/payments/payment-method", { credentials: "include" }),
        fetch("/api/payments/history?limit=5", { credentials: "include" }),
        fetch("/api/auth/session", { credentials: "include" }),
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
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;

    // Fast critical path: only what the main dashboard view needs to render.
    async function loadCritical() {
      try {
        const [appRes, meRes, formsRes, pendingRes, profileRes] = await Promise.all([
          fetch("/api/appointments/", { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
          fetch("/api/patient-forms/my-forms", { credentials: "include" }),
          fetch("/api/patient-forms/check-pending", { credentials: "include" }),
          fetch("/api/patient-profile/", { credentials: "include" }),
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
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Slower, secondary data (hits Stripe): loads in after the page is already visible.
    async function loadBilling() {
      try {
        const [cardRes, historyRes, sessionRes] = await Promise.all([
          fetch("/api/payments/payment-method", { credentials: "include" }),
          fetch("/api/payments/history?limit=5", { credentials: "include" }),
          fetch("/api/auth/session", { credentials: "include" }),
        ]);
        if (cancelled) return;
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
      } catch {
        // ignore
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    }

    loadCritical();
    loadBilling();
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
      <main className="min-h-screen bg-cream-50/60 px-4 py-10 sm:px-6 lg:px-8 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl animate-pulse">
          {/* Header banner skeleton */}
          <div className="rounded-2xl bg-cream-200/70 p-6 sm:p-8 dark:bg-neutral-800">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-cream-300/80 dark:bg-neutral-700" />
              <div className="space-y-2">
                <div className="h-5 w-40 rounded bg-cream-300/80 dark:bg-neutral-700" />
                <div className="h-3.5 w-28 rounded bg-cream-300/60 dark:bg-neutral-700" />
              </div>
            </div>
          </div>

          {/* Card grid skeleton */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-cream-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="h-4 w-24 rounded bg-cream-200 dark:bg-neutral-700" />
                <div className="mt-3 h-3.5 w-32 rounded bg-cream-100 dark:bg-neutral-600" />
                <div className="mt-2 h-3.5 w-20 rounded bg-cream-100 dark:bg-neutral-600" />
              </div>
            ))}
          </div>

        </div>
      </main>
    );
  }

  const firstName = (profile?.firstName || fullProfile?.user?.firstName || "there").trim();
  const fullName = [
    profile?.firstName || fullProfile?.user?.firstName || "",
    profile?.lastName || fullProfile?.user?.lastName || "",
  ].filter(Boolean).join(" ") || "Patient";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
  const lastLoginLabel = lastLoginIso
    ? new Date(lastLoginIso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="min-h-screen bg-cream-50/60 dark:bg-neutral-900">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Hero welcome banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cta via-cta/90 to-cta/75 p-7 shadow-lg">
          {/* decorative circles */}
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10" />
          <div aria-hidden className="pointer-events-none absolute bottom-0 right-16 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            {/* left: avatar + greeting */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white ring-2 ring-white/30">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-white/70">{getGreeting()}</p>
                <h1 className="text-2xl font-bold text-white">{firstName}</h1>
                <p className="mt-0.5 text-sm text-white/60">Patient Portal</p>
              </div>
            </div>

            {/* right: session chips */}
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end sm:gap-2">
              {lastLoginLabel && (
                <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-neutral-800 dark:text-gray-300">
                  <svg className="h-3.5 w-3.5 shrink-0 text-cta" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                  <span className="text-gray-400 dark:text-gray-400">Last login:</span>&nbsp;{lastLoginLabel}
                </div>
              )}
              {typeof sessionRemainingMs === "number" && sessionRemainingMs > 0 && (
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ${sessionRemainingMs <= 5 * 60 * 1000 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-white text-gray-700 dark:bg-neutral-800 dark:text-gray-300"}`}>
                  <svg className={`h-3.5 w-3.5 shrink-0 ${sessionRemainingMs <= 5 * 60 * 1000 ? "text-red-500" : "text-cta"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-gray-400 dark:text-gray-400">Session:</span>&nbsp;{formatSessionRemaining(sessionRemainingMs)} left
                </div>
              )}
            </div>
          </div>

          {/* next appointment or CTA */}
          <div className="relative mt-6 rounded-xl bg-white/15 px-5 py-4">
            {nextAppointment ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Next appointment</p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {formatAppointmentDateTime(nextAppointment.scheduledAt)}
                  </p>
                  <p className="text-sm text-white/70">
                    {typeLabel(nextAppointment.type)} · {nextAppointment.durationMinutes} min
                    {nextAppointment.doctor?.name ? ` · Dr. ${nextAppointment.doctor.name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextAppointment.status === "pending_confirmation" ? (
                    nextNeedsForms ? (
                      <Link href="/patient/forms" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-cta hover:bg-white/90">
                        Complete forms first
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/patient/confirm-scheduled?appointmentId=${encodeURIComponent(nextAppointment.id)}`}
                          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-cta hover:bg-white/90"
                        >
                          Confirm & add payment
                        </Link>
                        <button
                          type="button"
                          onClick={() => setChangeTimeAppointment(nextAppointment)}
                          className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30"
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
                          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-cta hover:bg-white/90"
                        >
                          Join appointment
                        </a>
                      )}
                      {canReschedule(nextAppointment) && (
                        <button
                          type="button"
                          onClick={() => setChangeTimeAppointment(nextAppointment)}
                          className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30"
                        >
                          Reschedule
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Next appointment</p>
                  <p className="mt-1 text-sm text-white/80">No upcoming appointments scheduled.</p>
                </div>
                <a
                  href="/patient/book"
                  onClick={(e) => handleNav(e, "/patient/book")}
                  className="self-start rounded-lg bg-white px-4 py-2 text-sm font-semibold text-cta hover:bg-white/90"
                >
                  Book appointment
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── Profile completion alert ── */}
        {profileComplete === false && (
          <div className="mt-5 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Complete your profile to book an appointment</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                We need your name, date of birth, SSN, and contact info before your orientation consult.
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

        {/* ── Preferred pharmacy needed (now that clinical intake is confirmed) ── */}
        {profileComplete !== false && fullProfile?.intakeConfirmed === true && !fullProfile?.profile?.preferredPharmacyName && (
          <div className="mt-5 flex items-start gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-indigo-900 dark:text-indigo-200">Add your preferred pharmacy</p>
              <p className="mt-1 text-sm text-indigo-800 dark:text-indigo-300">
                Now that your clinical intake is scheduled, please add your preferred pharmacy so your doctor can send prescriptions if needed.
              </p>
              <Link href="/patient/profile" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">
                Add pharmacy
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* ── Pending confirmation alert ── */}
        {pendingAppointments.length > 0 && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-800 dark:bg-blue-950/40">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-200">Action required — Confirm your appointment</p>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                  Your doctor has scheduled an appointment. Please confirm and add payment to secure your time.
                </p>
                <ul className="mt-4 space-y-3">
                  {pendingAppointments.map((a) => {
                    const mustCompleteForms = a.hasPendingFormsForThisAppointment === true;
                    return (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200/60 bg-white p-4 dark:border-blue-800/60 dark:bg-neutral-800">
                        <div>
                          <p className="font-medium text-navy dark:text-cream-100">{formatAppointmentDateTime(a.scheduledAt)} · {typeLabel(a.type)}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{a.durationMinutes} minutes</p>
                          {mustCompleteForms && (
                            <p className="mt-1 text-sm font-medium text-blue-700 dark:text-blue-300">Complete forms before confirming.</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {mustCompleteForms ? (
                            <Link href="/patient/forms" className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90">
                              Complete forms first
                            </Link>
                          ) : (
                            <>
                              <Link href={`/patient/confirm-scheduled?appointmentId=${encodeURIComponent(a.id)}`} className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90">
                                Confirm & add payment
                              </Link>
                              <button type="button" onClick={() => setChangeTimeAppointment(a)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700">
                                Change time
                              </button>
                              {canCancel(a) && (
                                <button type="button" onClick={() => openCancelConfirm(a)} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-red-950/40">
                                  Cancel
                                </button>
                              )}
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

        {/* ── Action tiles ── */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

          {/* My Profile */}
          <a href="/patient/profile" onClick={(e) => handleNav(e, "/patient/profile")} className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:border-neutral-700 dark:bg-neutral-800">
            <div className="h-1.5 w-full bg-cta" />
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-semibold text-navy dark:text-cream-100">My Profile</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Personal & health info</p>
                </div>
              </div>
              <div className="mt-4 flex-1">
                <p className="text-sm font-medium text-navy dark:text-cream-100">{fullName}</p>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{profile?.email || fullProfile?.user?.email || "—"}</p>
                {profileComplete === false && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Incomplete
                  </span>
                )}
                {profileComplete === true && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/60 dark:text-green-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Complete
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm font-medium text-cta group-hover:underline">View profile →</p>
            </div>
          </a>

          {/* Upcoming Visit */}
          <div className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
            <div className="h-1.5 w-full bg-cta" />
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v3m10.5-3v3M3.75 9.75h16.5M5.25 6.75h13.5A1.5 1.5 0 0120.25 8.25v11.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5z" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-semibold text-navy dark:text-cream-100">Upcoming Visit</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Your next appointment</p>
                </div>
              </div>
              <div className="mt-4 flex-1">
                {nextAppointment ? (
                  <>
                    <p className="text-sm font-semibold text-navy dark:text-cream-100">{formatAppointmentDateTime(nextAppointment.scheduledAt)}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{typeLabel(nextAppointment.type)} · {nextAppointment.durationMinutes} min</p>
                    {nextAppointment.doctor?.name && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Dr. {nextAppointment.doctor.name}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextAppointment.status === "pending_confirmation" ? (
                        nextNeedsForms ? (
                          <Link href="/patient/forms" className="rounded-lg bg-cta px-3 py-1.5 text-xs font-medium text-white hover:bg-cta/90">Complete forms</Link>
                        ) : (
                          <Link href={`/patient/confirm-scheduled?appointmentId=${encodeURIComponent(nextAppointment.id)}`} className="rounded-lg bg-cta px-3 py-1.5 text-xs font-medium text-white hover:bg-cta/90">Confirm & pay</Link>
                        )
                      ) : nextAppointment.meetLink ? (
                        <a href={nextAppointment.meetLink} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-cta px-3 py-1.5 text-xs font-medium text-white hover:bg-cta/90">Join visit</a>
                      ) : null}
                      {canReschedule(nextAppointment) && (
                        <button type="button" onClick={() => setChangeTimeAppointment(nextAppointment)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-neutral-600 dark:text-gray-300 dark:hover:bg-neutral-700">
                          Reschedule
                        </button>
                      )}
                      {canCancel(nextAppointment) && (
                        <button type="button" onClick={() => openCancelConfirm(nextAppointment)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40">
                          Cancel
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming appointments.</p>
                )}
              </div>
              <Link href="/patient/appointments" className="mt-4 text-sm font-medium text-cta hover:underline">
                {appointmentCount !== null ? `View all ${appointmentCount} appointments →` : "View all appointments →"}
              </Link>
            </div>
          </div>

          {/* Billing & Payments */}
          <div className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
            <div className="h-1.5 w-full bg-cta" />
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5m-18 0v9A2.25 2.25 0 006 19.5h12a2.25 2.25 0 002.25-2.25v-9m-16.5 0V6.75A2.25 2.25 0 016 4.5h12a2.25 2.25 0 012.25 2.25v1.5" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-semibold text-navy dark:text-cream-100">Billing & Payments</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Invoices and payment method</p>
                </div>
              </div>
              <div className="mt-4 flex-1 space-y-2">
                {billingLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 w-36 rounded bg-cream-200 dark:bg-neutral-700" />
                    <div className="h-3.5 w-28 rounded bg-cream-100 dark:bg-neutral-600" />
                  </div>
                ) : (
                  <>
                    {cardSummary?.hasCard ? (
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cta/10 text-cta">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5m-19.5 3h19.5" />
                          </svg>
                        </span>
                        <p className="text-sm font-medium text-navy dark:text-cream-100">
                          {(cardSummary.brand || "Card").toString().toUpperCase()} •••• {cardSummary.last4 || "—"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No card on file.</p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {paymentHistory.length > 0 ? `${paymentHistory.length} recent payment${paymentHistory.length === 1 ? "" : "s"}` : "No payment history yet."}
                    </p>
                  </>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/patient/billing" className="text-sm font-medium text-cta hover:underline">View invoices →</Link>
                <Link href="/patient/save-card?returnTo=/patient" className="text-sm font-medium text-cta hover:underline">
                  {cardSummary?.hasCard ? "Manage card →" : "Add card →"}
                </Link>
              </div>
            </div>
          </div>

          {/* Forms & Documents — only shown when assigned */}
          {hasAssignedForms && (
            <a href="/patient/forms" onClick={(e) => handleNav(e, "/patient/forms")} className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:border-neutral-700 dark:bg-neutral-800">
              <div className="h-1.5 w-full bg-cta" />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-8.625a1.125 1.125 0 00-1.125-1.125H8.25m11.25 9.75l-3-3m3 3l-3 3m-2.25-12h-6A1.125 1.125 0 007.125 6.375v11.25A1.125 1.125 0 008.25 18.75h8.625A1.125 1.125 0 0018 17.625V9.75a1.125 1.125 0 00-.33-.795l-3.375-3.375A1.125 1.125 0 0013.5 5.25z" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-semibold text-navy dark:text-cream-100">Forms & Documents</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {pendingFormsCheck?.pendingCount
                        ? `${pendingFormsCheck.pendingCount} form${pendingFormsCheck.pendingCount === 1 ? "" : "s"} pending`
                        : "Forms assigned by your doctor"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm text-gray-600 dark:text-gray-300">Complete forms assigned by your provider before your appointment.</p>
                <p className="mt-4 text-sm font-medium text-cta group-hover:underline">View forms →</p>
              </div>
            </a>
          )}

          {/* Book appointment */}
          <a href="/patient/book" onClick={(e) => handleNav(e, "/patient/book")} className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:border-neutral-700 dark:bg-neutral-800">
            <div className="h-1.5 w-full bg-cta" />
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-semibold text-navy dark:text-cream-100">Book Appointment</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Schedule a new visit</p>
                </div>
              </div>
              <p className="mt-4 flex-1 text-sm text-gray-600 dark:text-gray-300">Schedule a new appointment or a follow-up visit with your provider.</p>
              <p className="mt-4 text-sm font-medium text-cta group-hover:underline">Book now →</p>
            </div>
          </a>

        </div>

      </main>

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
      <ConfirmCancelModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        appointmentLabel={cancelTarget?.label ?? ""}
        onConfirm={confirmCancelAppointment}
      />
    </div>
  );
}
