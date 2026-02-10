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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [intRes, appRes, cardRes, meRes] = await Promise.all([
          fetch("/api/intake", { credentials: "include" }),
          fetch("/api/appointments/", { credentials: "include" }),
          fetch("/api/payments/payment-method", { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
        ]);
        if (intRes.status === 401 || appRes.status === 401 || cardRes.status === 401 || meRes.status === 401) {
          router.push("/login");
          return;
        }
        if (cancelled) return;
        const intake: IntakeResponse = await intRes.json();
        const apps = await appRes.json();
        const card = await cardRes.json().catch(() => null);
        const me = await meRes.json().catch(() => null);
        setIntakeStatus(intake?.status ?? "not_started");
        setAppointmentCount(Array.isArray(apps) ? apps.length : 0);
        setCardSummary(card && typeof card === "object" ? card : null);
        setProfile(me && typeof me === "object" ? me : null);
        if (me && typeof me === "object") {
          setProfileDraft({
            firstName: (me.firstName ?? "").toString(),
            lastName: (me.lastName ?? "").toString(),
            phone: (me.phone ?? "").toString(),
          });
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

