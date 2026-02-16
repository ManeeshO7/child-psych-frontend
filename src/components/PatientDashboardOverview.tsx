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
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
  }>({ firstName: "", lastName: "", phone: "" });
  const [cardSummary, setCardSummary] = useState<{
    hasCard: boolean;
    brand?: string | null;
    last4?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
  } | null>(null);
  const [hasAssignedForms, setHasAssignedForms] = useState<boolean>(false);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [pendingFormsCheck, setPendingFormsCheck] = useState<{
    hasPendingForms: boolean;
    pendingCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [changeTimeAppointment, setChangeTimeAppointment] = useState<PendingAppointment | null>(null);

  async function refreshData() {
    try {
      const [appRes, cardRes, meRes, formsRes, pendingRes] = await Promise.all([
        fetch("/api/appointments/", { credentials: "include" }),
        fetch("/api/payments/payment-method", { credentials: "include" }),
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/patient-forms/my-forms", { credentials: "include" }),
        fetch("/api/patient-forms/check-pending", { credentials: "include" }),
      ]);
      if (appRes.status === 401 || cardRes.status === 401 || meRes.status === 401) {
        router.push("/login");
        return;
      }
      const apps = await appRes.json();
      const card = await cardRes.json().catch(() => null);
      const me = await meRes.json().catch(() => null);
      const forms = formsRes.ok ? await formsRes.json().catch(() => []) : [];
      const appList = Array.isArray(apps) ? apps : [];
      setAppointmentCount(appList.length);
      setPendingAppointments(
        appList.filter(
          (a: { status?: string }) => a.status === "pending_confirmation"
        ) as PendingAppointment[]
      );
      setCardSummary(card && typeof card === "object" ? card : null);
      setProfile(me && typeof me === "object" ? me : null);
      setHasAssignedForms(Array.isArray(forms) && forms.length > 0);
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json().catch(() => null);
        setPendingFormsCheck(pendingData);
      }
      if (me && typeof me === "object") {
        setProfileDraft({
          firstName: (me.firstName ?? "").toString(),
          lastName: (me.lastName ?? "").toString(),
          phone: (me.phone ?? "").toString(),
        });
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [appRes, cardRes, meRes, formsRes, pendingRes] = await Promise.all([
          fetch("/api/appointments/", { credentials: "include" }),
          fetch("/api/payments/payment-method", { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
          fetch("/api/patient-forms/my-forms", { credentials: "include" }),
          fetch("/api/patient-forms/check-pending", { credentials: "include" }),
        ]);
        if (appRes.status === 401 || cardRes.status === 401 || meRes.status === 401) {
          router.push("/login");
          return;
        }
        if (cancelled) return;
        const apps = await appRes.json();
        const card = await cardRes.json().catch(() => null);
        const me = await meRes.json().catch(() => null);
        const forms = formsRes.ok ? await formsRes.json().catch(() => []) : [];
        const appList = Array.isArray(apps) ? apps : [];
        setAppointmentCount(appList.length);
        setPendingAppointments(
          appList.filter(
            (a: { status?: string }) => a.status === "pending_confirmation"
          ) as PendingAppointment[]
        );
        setCardSummary(card && typeof card === "object" ? card : null);
        setProfile(me && typeof me === "object" ? me : null);
        setHasAssignedForms(Array.isArray(forms) && forms.length > 0);
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json().catch(() => null);
          setPendingFormsCheck(pendingData);
        }
        if (me && typeof me === "object") {
          setProfileDraft({
            firstName: (me.firstName ?? "").toString(),
            lastName: (me.lastName ?? "").toString(),
            phone: (me.phone ?? "").toString(),
          });
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

  async function saveProfile() {
    setSavingProfile(true);
    setProfileErr(null);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: profileDraft.firstName,
          lastName: profileDraft.lastName,
          phone: profileDraft.phone,
        }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProfileErr(data.detail || "Failed to update profile");
        setSavingProfile(false);
        return;
      }
      const updated = await res.json().catch(() => null);
      if (updated && typeof updated === "object") {
        setProfile((prev) => ({ ...prev, ...updated }));
      }
      setProfileMsg("Profile updated.");
      setEditingProfile(false);
    } catch {
      setProfileErr("Network error while updating profile");
    } finally {
      setSavingProfile(false);
      window.setTimeout(() => setProfileMsg(null), 3000);
    }
  }

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

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-warm-brown">Profile</h2>
              <p className="text-sm text-gray-600">Your account details.</p>
            </div>
          </div>

          {profileErr && <p className="text-sm text-red-600">{profileErr}</p>}
          {profileMsg && <p className="text-sm text-green-700">{profileMsg}</p>}

          {!editingProfile ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-gray-900">
                {(profile?.firstName || "—")} {(profile?.lastName || "")}
              </p>
              <p className="text-sm text-gray-700">{profile?.email || "—"}</p>
              <p className="text-sm text-gray-700">{profile?.phone || "—"}</p>

              <button
                type="button"
                onClick={() => {
                  setProfileErr(null);
                  setProfileMsg(null);
                  setEditingProfile(true);
                }}
                className="mt-2 inline-block text-sm font-medium text-warm-brown hover:underline"
              >
                Edit profile →
              </button>

              <div className="mt-4 border-t border-cream-200 pt-3">
                <p className="text-xs font-medium text-gray-500">Card on file</p>
                {cardSummary?.hasCard ? (
                  <p className="mt-1 text-sm text-gray-900">
                    {(cardSummary.brand || "Card").toString().toUpperCase()} •••• {cardSummary.last4 || "—"}{" "}
                    <span className="text-gray-600">
                      (exp {cardSummary.expMonth || "—"}/{cardSummary.expYear || "—"})
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-700">No card on file</p>
                )}
                <Link
                  href="/patient/save-card"
                  className="mt-2 inline-block text-sm font-medium text-warm-brown hover:underline"
                >
                  {cardSummary?.hasCard ? "Update card →" : "Add card →"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">First name</span>
                <input
                  value={profileDraft.firstName}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, firstName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Last name</span>
                <input
                  value={profileDraft.lastName}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, lastName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Phone</span>
                <input
                  value={profileDraft.phone}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="btn-primary disabled:opacity-50"
                >
                  {savingProfile ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileErr(null);
                    setProfileMsg(null);
                    setProfileDraft({
                      firstName: (profile?.firstName ?? "").toString(),
                      lastName: (profile?.lastName ?? "").toString(),
                      phone: (profile?.phone ?? "").toString(),
                    });
                  }}
                  className="text-sm font-medium text-gray-700 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

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

