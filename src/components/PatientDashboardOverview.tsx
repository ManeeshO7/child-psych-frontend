"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RescheduleModal from "@/components/RescheduleModal";

type IntakeResponse =
  | null
  | {
      status?: "draft" | "submitted" | "reviewed" | string;
    };

type PendingAppointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  type: string;
  status: string;
};

const PRACTICE_TZ = "America/Los_Angeles";

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
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [pendingFormsCheck, setPendingFormsCheck] = useState<{
    hasPendingForms: boolean;
    pendingCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [changeTimeAppointment, setChangeTimeAppointment] = useState<PendingAppointment | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  async function refreshData() {
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
      const apps = await appRes.json();
      const me = await meRes.json().catch(() => null);
      const forms = formsRes.ok ? await formsRes.json().catch(() => []) : [];
      const appList = Array.isArray(apps) ? apps : [];
      setAppointmentCount(appList.length);
      setPendingAppointments(
        appList.filter(
          (a: { status?: string }) => a.status === "pending_confirmation"
        ) as PendingAppointment[]
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
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
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
        setPendingAppointments(
          appList.filter(
            (a: { status?: string }) => a.status === "pending_confirmation"
          ) as PendingAppointment[]
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
        Manage your profile and appointments.
      </p>

      {profileComplete === false && (
        <div className="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800" aria-hidden>
              !
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-amber-900">Complete your profile first</h2>
              <p className="mt-1 text-sm text-amber-800">
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
        <div className="mt-8 rounded-xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800" aria-hidden>
              !
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-amber-900">
                Action required — Confirm your appointment
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Your doctor has scheduled an appointment for you. Please confirm to add payment and secure your time.
              </p>
              <ul className="mt-4 space-y-3">
                {pendingAppointments.map((a) => {
                  const isClinicalIntake = a.type === "clinical_intake";
                  const mustCompleteForms =
                    isClinicalIntake && pendingFormsCheck?.hasPendingForms;
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-4"
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

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/patient/profile"
          className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-warm-brown">Profile</h2>
          <p className="text-sm text-gray-600">Your profile details.</p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {(profile?.firstName || fullProfile?.user?.firstName || "—")}{" "}
            {(profile?.lastName || fullProfile?.user?.lastName || "")}
          </p>
          {profileComplete === false && (
            <p className="text-xs text-amber-700">Profile incomplete — complete to book orientation.</p>
          )}
          <p className="mt-auto text-sm font-medium text-warm-brown">View profile →</p>
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

        {hasAssignedForms && (
          <Link
            href="/patient/forms"
            className="card flex flex-col gap-2 transition hover:border-warm-brown/40 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-warm-brown">Forms & Documents</h2>
            <p className="text-sm text-gray-600">
              Complete forms assigned by your doctor.
            </p>
            <p className="mt-auto text-sm font-medium text-warm-brown">View forms →</p>
          </Link>
        )}

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

      <RescheduleModal
        isOpen={!!changeTimeAppointment}
        onClose={() => setChangeTimeAppointment(null)}
        appointmentId={changeTimeAppointment?.id ?? ""}
        durationMinutes={changeTimeAppointment?.durationMinutes ?? 30}
        appointmentType={changeTimeAppointment?.type}
        variant="change-proposed-time"
        onSuccess={() => {
          setChangeTimeAppointment(null);
          refreshData();
        }}
      />
    </main>
  );
}

