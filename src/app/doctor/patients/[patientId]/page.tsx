"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { questionnaireToQandA } from "@/lib/questionnaireLabels";
import {
  PHQA_QUESTIONNAIRE_KEY,
  PHQA_QUESTIONS,
  PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION,
  computePHQAScores,
  phqaResponseToOptionLabel,
  phqaFunctionalImpairmentToOptionLabel,
} from "@/lib/phqa";
import {
  PHQ9_QUESTIONNAIRE_KEY,
  PHQ9_QUESTIONS,
  computePHQ9Scores,
  phq9ResponseToOptionLabel,
} from "@/lib/phq9";
import {
  SCARED_CHILD_QUESTIONNAIRE_KEY,
  SCARED_CHILD_QUESTIONS,
  computeScaredChildScores,
  scaredChildResponseToOptionLabel,
} from "@/lib/scaredChild";
import {
  SCARED_PARENT_QUESTIONNAIRE_KEY,
  SCARED_PARENT_QUESTIONS,
  computeScaredParentScores,
  scaredParentResponseToOptionLabel,
} from "@/lib/scaredParent";
import {
  ADHD_PARENT_RATING_QUESTIONNAIRE_KEY,
  ADHD_PARENT_INATTENTION_QUESTIONS,
  ADHD_PARENT_HYPERACTIVITY_QUESTIONS,
  ADHD_PARENT_FUNCTIONAL_IMPACT_QUESTIONS,
  computeADHDParentScores,
  adhdParentResponseToOptionLabel,
} from "@/lib/adhdParentRating";
import {
  ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY,
  ADHD_TEACHER_INATTENTION_QUESTIONS,
  ADHD_TEACHER_HYPERACTIVITY_QUESTIONS,
  ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS,
  computeADHDTeacherScores,
  adhdTeacherResponseToOptionLabel,
} from "@/lib/adhdTeacherRating";
import { formatPhone } from "@/lib/formatPhone";
import AssignFormsModal from "@/components/AssignFormsModal";
import ScheduleClinicalIntakeModal from "@/components/ScheduleClinicalIntakeModal";
import ScheduleFollowupModal from "@/components/ScheduleFollowupModal";
import RescheduleModal from "@/components/RescheduleModal";
import ConfirmChargeModal from "@/components/ConfirmChargeModal";

type PatientProfileData = {
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
};

type PatientOverview = {
  patientId: string;
  fhirPatientId?: string | null;
  patientName: string;
  patientEmail: string;
  patientPhone?: string | null;
  address?: string | null;
  patientProfile?: PatientProfileData | null;
  patientRequest?: {
    id: string;
    status: string;
    questionnaireData: Record<string, unknown> | null;
    createdAt: string | null;
  } | null;
  appointments: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    type: string;
    notes: string | null;
    meetLink: string | null;
    durationMinutes?: number;
  }>;
  formAssignments: Array<{
    id: string;
    formId: string;
    formTitle: string;
    formType: string;
    formQuestionnaireKey?: string | null;
    status: string;
    assignedAt: string;
    completedAt: string | null;
    fhirResponseId: string | null;
    questionnaireData?: Record<string, unknown> | null;
    uploadedGcsPath: string | null;
    downloadUrl: string | null;
    appointmentId?: string | null;
    appointmentScheduledAt?: string | null;
    appointmentType?: string | null;
  }>;
  patientDocuments?: Array<{
    id: string;
    displayName: string;
    fileName: string;
    contentType?: string;
    createdAt: string;
    downloadUrl?: string | null;
  }>;
  intakeSubmission?: {
    id: string;
    formData: Record<string, unknown> | null;
    status: string;
    reviewedAt: string | null;
  } | null;
};

const RESCHEDULABLE_STATUSES = ["scheduled", "card_on_file", "paid"];

function canReschedule(a: { scheduledAt: string; status: string }): boolean {
  return RESCHEDULABLE_STATUSES.includes(a.status);
}

export default function PatientOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;
  const [overview, setOverview] = useState<PatientOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showFormResponses, setShowFormResponses] = useState<Record<string, boolean>>({});
  const [assignFormsOpen, setAssignFormsOpen] = useState(false);
  const [assignFormsForAppointmentId, setAssignFormsForAppointmentId] = useState<string | null>(null);
  const [scheduleClinicalIntakeOpen, setScheduleClinicalIntakeOpen] = useState(false);
  const [assignFormsAfterSchedule, setAssignFormsAfterSchedule] = useState(false);
  const [scheduleFollowupOpen, setScheduleFollowupOpen] = useState(false);
  const [followupAllowedTypes, setFollowupAllowedTypes] = useState<string[]>(["followup_med_30", "followup_med_therapy_45"]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<PatientOverview["appointments"][0] | null>(null);
  const [chargeConfirmAppointment, setChargeConfirmAppointment] = useState<PatientOverview["appointments"][0] | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [openingMeetId, setOpeningMeetId] = useState<string | null>(null);
  const openingMeetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (patientId) {
      loadOverview();
    }
  }, [patientId]);

  useEffect(() => {
    return () => {
      if (openingMeetTimeoutRef.current) clearTimeout(openingMeetTimeoutRef.current);
    };
  }, []);

  async function loadOverview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patient-forms/patient/${patientId}/overview`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load patient overview");
      }
      const data = await res.json();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient overview");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveAppointmentNotes(apt: { id: string; notes: string | null }) {
    const notes = (notesDraft[apt.id] ?? apt.notes ?? "").trim();
    setNotesError(null);
    setSavingNotesId(apt.id);
    try {
      const res = await fetch(`/api/appointments/${apt.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setNotesError(err.detail || "Failed to save notes");
        return;
      }
      setNotesDraft((prev) => {
        const next = { ...prev };
        delete next[apt.id];
        return next;
      });
      setEditingNotesId(null);
      await loadOverview();
    } catch (e) {
      console.error(e);
      setNotesError("Network error. Please try again.");
    } finally {
      setSavingNotesId(null);
    }
  }

  async function completeAppointment(id: string) {
    if (completingId !== null) return;
    setCompletingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to mark as completed");
        setCompletingId(null);
        return;
      }
      await loadOverview();
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setCompletingId(null);
    }
  }

  const PRACTICE_TZ = "America/Los_Angeles";

  function getPatientAgeYears(): number | null {
    const dob = overview?.patientProfile?.dateOfBirth;
    if (!dob) return null;
    const dt = new Date(dob);
    if (Number.isNaN(dt.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dt.getFullYear();
    const m = now.getMonth() - dt.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) age -= 1;
    return age;
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      timeZone: PRACTICE_TZ,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading patient overview…</p>
      </main>
    );
  }

  if (error || !overview) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || "Patient not found"}</p>
          <Link href="/doctor/patients" className="mt-2 inline-block text-sm text-red-800 hover:underline">
            ← Back to patients
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50/60">
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/doctor/patients" className="inline-flex items-center gap-1 text-sm text-cta hover:underline mb-6">
        ← Back to patients
      </Link>

      {/* Patient header */}
      <div className="mb-8 flex flex-wrap items-center gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cta/10 text-2xl font-bold text-cta">
          {(overview.patientName || "?")[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy">{overview.patientName}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{overview.patientEmail}</p>
          {overview.patientPhone && (
            <p className="text-sm text-gray-500">{formatPhone(overview.patientPhone)}</p>
          )}
        </div>
      </div>

      {/* Patient Information Card */}
      <div className="mt-2 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cta/10">
            <svg className="h-4 w-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-navy">Patient Information</h2>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            { label: "Name", value: overview.patientName },
            { label: "Email", value: overview.patientEmail },
            overview.patientPhone ? { label: "Phone", value: formatPhone(overview.patientPhone) } : null,
            (overview.address || overview.patientProfile?.address) ? { label: "Address", value: overview.address || overview.patientProfile?.address } : null,
            overview.patientProfile?.sex ? { label: "Sex", value: overview.patientProfile.sex.replace(/_/g, " ") } : null,
            overview.patientProfile?.dateOfBirth ? { label: "Date of birth", value: overview.patientProfile.dateOfBirth } : null,
            overview.patientProfile?.ssn ? {
              label: "SSN",
              value: overview.patientProfile.ssn.replace(/\D/g, "").length === 9
                ? `${overview.patientProfile.ssn.replace(/\D/g, "").slice(0,3)}-${overview.patientProfile.ssn.replace(/\D/g, "").slice(3,5)}-${overview.patientProfile.ssn.replace(/\D/g, "").slice(5)}`
                : overview.patientProfile.ssn
            } : null,
          ].filter(Boolean).map((field) => (
            <div key={field!.label} className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{field!.label}</span>
              <span className="text-sm font-medium text-navy">{field!.value || "—"}</span>
            </div>
          ))}
        </div>

        {(overview.patientProfile?.preferredPharmacyName || overview.patientProfile?.preferredPharmacyPhone || overview.patientProfile?.preferredPharmacyAddress) && (
          <div className="mt-5 rounded-xl border border-cream-200 bg-cream-50/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Preferred Pharmacy</p>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {overview.patientProfile.preferredPharmacyName && (
                <div><span className="text-xs text-gray-400">Name</span><p className="font-medium text-navy">{overview.patientProfile.preferredPharmacyName}</p></div>
              )}
              {overview.patientProfile.preferredPharmacyPhone && (
                <div><span className="text-xs text-gray-400">Phone</span><p className="font-medium text-navy">{formatPhone(overview.patientProfile.preferredPharmacyPhone)}</p></div>
              )}
              {overview.patientProfile.preferredPharmacyAddress && (
                <div className="sm:col-span-2"><span className="text-xs text-gray-400">Address</span><p className="font-medium text-navy">{overview.patientProfile.preferredPharmacyAddress}</p></div>
              )}
            </div>
          </div>
        )}

        {[
          { label: "Guardian 1", name: overview.patientProfile?.guardian1Name, rel: overview.patientProfile?.guardian1Relationship, phone: overview.patientProfile?.guardian1Phone },
          { label: "Guardian 2", name: overview.patientProfile?.guardian2Name, rel: overview.patientProfile?.guardian2Relationship, phone: overview.patientProfile?.guardian2Phone },
        ].filter((g) => g.name || g.rel || g.phone).map((g) => (
          <div key={g.label} className="mt-3 rounded-xl border border-cream-200 bg-cream-50/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{g.label}</p>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              {g.name && <div><span className="text-xs text-gray-400">Name</span><p className="font-medium text-navy">{g.name}</p></div>}
              {g.rel && <div><span className="text-xs text-gray-400">Relationship</span><p className="font-medium text-navy">{g.rel}</p></div>}
              {g.phone && <div><span className="text-xs text-gray-400">Phone</span><p className="font-medium text-navy">{formatPhone(g.phone)}</p></div>}
            </div>
          </div>
        ))}

        {!overview.patientProfile && (
          <p className="mt-4 text-sm text-gray-400 italic">Profile incomplete or not yet submitted.</p>
        )}
      </div>

      {/* Patient Documents */}
      <div className="mt-5 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
            <svg className="h-4 w-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-navy">Patient Documents</h2>
            <p className="text-xs text-gray-400">Previously uploaded medical records</p>
          </div>
        </div>
        {overview.patientDocuments && overview.patientDocuments.length > 0 ? (
          <ul className="space-y-2">
            {overview.patientDocuments.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-200 bg-cream-50/60 px-4 py-3">
                <div>
                  <p className="font-medium text-navy">{doc.displayName || doc.fileName}</p>
                  <p className="text-xs text-gray-400">{doc.fileName}</p>
                </div>
                {doc.downloadUrl && (
                  <div className="flex items-center gap-2">
                    <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex rounded-lg border border-cta bg-white px-3 py-1.5 text-xs font-medium text-cta hover:bg-cta/10 transition">
                      View
                    </a>
                    <a href={doc.downloadUrl} download={doc.fileName} target="_blank" rel="noopener noreferrer"
                      className="inline-flex rounded-lg bg-cta px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition">
                      Download
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-cream-300 py-8 text-center">
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          </div>
        )}
      </div>

      {/* Action reminders - same logic as completed appointments list */}
      {(() => {
        const completedOrientation = overview.appointments.find(
          (a) => a.type === "orientation_consult" && a.status === "completed"
        );
        // Next appointment to assign forms to: clinical intake (or follow-up) that is upcoming
        const clinicalIntakeForForms = overview.appointments.find(
          (a) =>
            a.type === "clinical_intake" &&
            ["pending_confirmation", "scheduled", "card_on_file", "paid"].includes(a.status)
        );
        const hasFormsForClinicalIntake =
          !!clinicalIntakeForForms &&
          overview.formAssignments.some((fa) => fa.appointmentId === clinicalIntakeForForms.id);
        // Has any clinical intake (pending, scheduled, or completed) — hide "Schedule clinical intake" once they have one
        const hasClinicalIntake = overview.appointments.some(
          (a) => a.type === "clinical_intake" && a.status !== "cancelled"
        );
        const completedClinicalIntake = overview.appointments.find(
          (a) => (a.type === "clinical_intake" || a.type === "intake") && a.status === "completed"
        );
        const hasScheduledFollowup = overview.appointments.some(
          (a) =>
            (a.type === "followup_med_30" || a.type === "followup_med_therapy_45") &&
            ["pending_confirmation", "scheduled", "card_on_file", "paid"].includes(a.status)
        );

        const showAssignForms = completedOrientation && !!clinicalIntakeForForms && !hasFormsForClinicalIntake;
        const showScheduleClinicalIntake = completedOrientation && !hasClinicalIntake;
        const showScheduleAndAssignForms = completedOrientation && !hasClinicalIntake;
        const showScheduleFollowup = !!completedClinicalIntake && !hasScheduledFollowup;

        if (!showAssignForms && !showScheduleClinicalIntake && !showScheduleAndAssignForms && !showScheduleFollowup) return null;

        return (
          <div className="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800"
                aria-hidden
              >
                !
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-amber-900">Action reminders</h2>
                <p className="mt-1 text-sm text-amber-800">
                  Complete these actions for this patient.
                </p>
                <ul className="mt-4 space-y-3">
                  {showAssignForms && (
                    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-4">
                      <div>
                        <p className="font-medium text-navy">Assign forms</p>
                        <p className="text-sm text-gray-600">
                          Orientation completed. Assign forms for the patient to complete before clinical intake.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignFormsForAppointmentId(clinicalIntakeForForms?.id ?? null);
                          setAssignFormsOpen(true);
                        }}
                        className="inline-flex rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90"
                      >
                        Assign forms →
                      </button>
                    </li>
                  )}
                  {showScheduleClinicalIntake && (
                    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-4">
                      <div>
                        <p className="font-medium text-navy">Schedule clinical intake</p>
                        <p className="text-sm text-gray-600">
                          Schedule a 75-minute clinical intake appointment for this patient.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAssignFormsAfterSchedule(false);
                            setScheduleClinicalIntakeOpen(true);
                          }}
                          className="inline-flex rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90"
                        >
                          Schedule clinical intake →
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignFormsAfterSchedule(true);
                            setScheduleClinicalIntakeOpen(true);
                          }}
                          className="inline-flex rounded-lg border-2 border-cta bg-white px-4 py-2 text-sm font-medium text-cta hover:bg-amber-50"
                        >
                          Schedule & assign forms →
                        </button>
                      </div>
                    </li>
                  )}
                  {showScheduleFollowup && (
                    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-4">
                      <div>
                        <p className="font-medium text-navy">Schedule follow-up</p>
                        <p className="text-sm text-gray-600">
                          Clinical intake completed. Schedule a follow-up (30 or 45 min) for this patient.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/appointments/patient/${patientId}/allowed-followup-types`,
                              { credentials: "include" }
                            );
                            const data = res.ok ? await res.json() : {};
                            const types = data.allowedTypes ?? ["followup_med_30", "followup_med_therapy_45"];
                            startTransition(() => {
                              setFollowupAllowedTypes(types);
                              setScheduleFollowupOpen(true);
                            });
                          } catch {
                            startTransition(() => {
                              setFollowupAllowedTypes(["followup_med_30", "followup_med_therapy_45"]);
                              setScheduleFollowupOpen(true);
                            });
                          }
                        }}
                        className="inline-flex rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90"
                      >
                        Schedule follow-up →
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pre-screening questionnaire - Collapsible section */}
      {overview.patientRequest && (
        <div className="mt-6 card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy">Pre-screening questionnaire</h2>
            {overview.patientRequest.questionnaireData && 
             typeof overview.patientRequest.questionnaireData === 'object' &&
             Object.keys(overview.patientRequest.questionnaireData).length > 0 && (
              <button
                type="button"
                onClick={() => setShowQuestionnaire(!showQuestionnaire)}
                className="flex items-center gap-1 text-sm font-medium text-cta hover:underline"
              >
                {showQuestionnaire ? "Hide" : "Show"} responses
                <svg
                  className={`h-4 w-4 transition-transform ${showQuestionnaire ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          {showQuestionnaire && overview.patientRequest.questionnaireData && 
           typeof overview.patientRequest.questionnaireData === 'object' &&
           Object.keys(overview.patientRequest.questionnaireData).length > 0 && (
            <div className="mt-4 space-y-3">
              {questionnaireToQandA(overview.patientRequest.questionnaireData).map((qa, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">{qa.question}</p>
                  <p className="mt-1 text-sm text-navy">{qa.answer}</p>
                </div>
              ))}
            </div>
          )}
          {!overview.patientRequest.questionnaireData || 
           (typeof overview.patientRequest.questionnaireData === 'object' &&
            Object.keys(overview.patientRequest.questionnaireData).length === 0) && (
            <p className="mt-2 text-sm text-gray-600">No questionnaire data available for this patient.</p>
          )}
        </div>
      )}

      {overview.intakeSubmission && (
        <div className="mt-6 card">
          <h2 className="text-lg font-semibold text-navy mb-4">Intake Submission</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-gray-700">Status:</span>{" "}
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                {overview.intakeSubmission.status}
              </span>
            </p>
            {overview.intakeSubmission.reviewedAt && (
              <p>
                <span className="font-medium text-gray-700">Reviewed:</span> {formatDate(overview.intakeSubmission.reviewedAt)}
              </p>
            )}
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(overview.intakeSubmission.formData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 card">
        <h2 className="text-lg font-semibold text-navy mb-4">Appointments & Form Responses</h2>
        {overview.appointments.length === 0 && overview.formAssignments.filter((fa) => !fa.appointmentId).length === 0 ? (
          <p className="text-sm text-gray-600">No appointments yet.</p>
        ) : (
          <div className="space-y-6">
            {overview.appointments.map((apt) => {
              const formsForApt = overview.formAssignments.filter((fa) => fa.appointmentId === apt.id);
              return (
              <div key={apt.id} className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="flex-1">
                    <p className="font-medium text-navy">{formatDate(apt.scheduledAt)}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {(apt.durationMinutes ?? 30)} min · {apt.type.replace(/_/g, " ")} · {apt.status}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {apt.meetLink && (apt.status === "scheduled" || apt.status === "card_on_file" || apt.status === "paid") && (
                        <a
                          href={apt.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (openingMeetTimeoutRef.current) clearTimeout(openingMeetTimeoutRef.current);
                            setOpeningMeetId(apt.id);
                            openingMeetTimeoutRef.current = window.setTimeout(() => {
                              setOpeningMeetId(null);
                              openingMeetTimeoutRef.current = null;
                            }, 2000);
                          }}
                          className="inline-flex items-center rounded-lg border border-cta/50 bg-cta/5 px-3 py-1.5 text-sm font-medium text-cta hover:bg-cta/10"
                        >
                          {openingMeetId === apt.id ? "Opening…" : "Join video call →"}
                        </a>
                      )}
                      {apt.status === "pending_confirmation" && (
                        <button
                          type="button"
                          onClick={() => setRescheduleAppointment(apt)}
                          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Change time
                        </button>
                      )}
                      {canReschedule(apt) && (
                        <button
                          type="button"
                          onClick={() => setRescheduleAppointment(apt)}
                          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Reschedule
                        </button>
                      )}
                      {apt.status === "card_on_file" && (
                        <button
                          type="button"
                          onClick={() => setChargeConfirmAppointment(apt)}
                          className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                        >
                          Charge now
                        </button>
                      )}
                      {apt.status === "paid" && (
                        <button
                          type="button"
                          onClick={() => completeAppointment(apt.id)}
                          disabled={completingId !== null}
                          className="inline-flex items-center rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                        >
                          {completingId === apt.id ? "Marking…" : "Mark as complete"}
                        </button>
                      )}
                    </div>
                    {apt.status === "completed" && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label className="block text-sm font-medium text-gray-700">Meeting notes</label>
                          {editingNotesId !== apt.id && (
                            <button
                              type="button"
                              onClick={() => setEditingNotesId(apt.id)}
                              className="inline-flex items-center gap-1 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-cta"
                              title="Edit notes"
                              aria-label="Edit notes"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {editingNotesId === apt.id ? (
                          <>
                            <p className="text-xs text-gray-500 mb-1">Stored in FHIR for HIPAA compliance.</p>
                            <textarea
                              value={notesDraft[apt.id] ?? apt.notes ?? ""}
                              onChange={(e) => setNotesDraft((prev) => ({ ...prev, [apt.id]: e.target.value }))}
                              placeholder="Add or edit notes about this appointment..."
                              rows={3}
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-cta focus:ring-cta"
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveAppointmentNotes(apt)}
                                disabled={savingNotesId !== null}
                                className="rounded-md bg-cta px-3 py-1.5 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
                              >
                                {savingNotesId === apt.id ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNotesId(null);
                                  setNotesDraft((prev) => {
                                    const next = { ...prev };
                                    delete next[apt.id];
                                    return next;
                                  });
                                }}
                                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                            {notesError && savingNotesId === apt.id && (
                              <p className="mt-2 text-sm text-red-600">{notesError}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {apt.notes && apt.notes.trim() ? apt.notes : <span className="italic text-gray-400">No notes yet</span>}
                          </p>
                        )}
                      </div>
                    )}
                    {apt.status !== "completed" && apt.notes && (
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {apt.notes}
                      </p>
                    )}
                    {["scheduled", "pending_confirmation", "card_on_file", "paid"].includes(apt.status) &&
                      ["clinical_intake", "followup_med_30", "followup_med_therapy_45"].includes(apt.type) &&
                      overview.formAssignments.filter((fa) => fa.appointmentId === apt.id).length === 0 && (
                      <p className="mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAssignFormsForAppointmentId(apt.id);
                            setAssignFormsOpen(true);
                          }}
                          className="text-sm font-medium text-cta hover:underline"
                        >
                          Assign forms for this appointment →
                        </button>
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                      apt.status === "scheduled"
                        ? "bg-green-100 text-green-800"
                        : apt.status === "card_on_file"
                          ? "bg-amber-100 text-amber-800"
                          : apt.status === "paid"
                            ? "bg-blue-100 text-blue-800"
                            : apt.status === "completed"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {apt.status === "card_on_file" ? "Card on file" : apt.status === "paid" ? "Paid" : apt.status}
                  </span>
                </div>
                {formsForApt.length > 0 && (
                  <div className="border-t border-gray-200 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Forms for this appointment</p>
                    <div className="space-y-3">
                      {formsForApt.map((fa) => {
                        const hasQuestionnaireData =
                          fa.formType === "questionnaire" &&
                          fa.questionnaireData &&
                          typeof fa.questionnaireData === "object" &&
                          Object.keys(fa.questionnaireData).length > 0;
                        const isExpanded = showFormResponses[fa.id];
                        return (
                          <div key={fa.id} className="rounded-lg border border-cream-200 bg-gray-50/50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-navy">{fa.formTitle}</p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {fa.formType === "questionnaire" ? "Questionnaire" : "PDF Upload"}
                                  {fa.assignedAt && <> · Assigned: {formatDate(fa.assignedAt)}</>}
                                  {fa.completedAt && <> · Completed: {formatDate(fa.completedAt)}</>}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    fa.status === "completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {fa.status === "completed" ? "Completed" : "Pending"}
                                </span>
                                {hasQuestionnaireData && (
                                  <button
                                    type="button"
                                    onClick={() => setShowFormResponses((prev) => ({ ...prev, [fa.id]: !prev[fa.id] }))}
                                    className="text-sm font-medium text-cta hover:underline"
                                  >
                                    {isExpanded ? "Hide" : "Show"} responses
                                  </button>
                                )}
                              </div>
                            </div>
                            {hasQuestionnaireData && isExpanded && (
                              <div className="mt-4 space-y-4">
                                {fa.formQuestionnaireKey === PHQA_QUESTIONNAIRE_KEY ? (
                                  (() => {
                                    const scores = computePHQAScores(fa.questionnaireData!);
                                    return (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                        <h4 className="text-sm font-semibold text-navy">PHQ-A Scoring</h4>
                                        <div className="grid gap-2 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Total score:</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.total >= 10
                                                  ? "bg-amber-100 text-amber-900"
                                                  : "bg-gray-100 text-navy"
                                              }`}
                                            >
                                              {scores.total}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Depression severity:</span>
                                            <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                              {scores.severityLabel}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Suicide safety trigger:</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.suicideSafetyTrigger
                                                  ? "bg-red-100 text-red-900"
                                                  : "bg-green-100 text-green-900"
                                              }`}
                                            >
                                              {scores.suicideSafetyTrigger
                                                ? "Yes (item 9 is 1 or higher)"
                                                : "No"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">
                                              Functional impairment (optional):
                                            </span>
                                            <span className="inline-flex rounded-md bg-purple-100 px-2 py-0.5 text-sm font-semibold text-purple-900">
                                              {phqaFunctionalImpairmentToOptionLabel(
                                                scores.functionalImpairment
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                        <ul className="space-y-2.5">
                                          {PHQA_QUESTIONS.map((q, idx) => (
                                            <li
                                              key={q.linkId}
                                              className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                            >
                                              <span className="pr-3 leading-5 text-navy">
                                                {idx + 1}. {q.question}
                                              </span>
                                              <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                {phqaResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                              </span>
                                            </li>
                                          ))}
                                          <li className="flex items-start justify-between gap-3 rounded-md border border-purple-200 bg-purple-50/40 px-3 py-2 text-sm">
                                            <span className="pr-3 leading-5 text-navy">
                                              10. (Optional) {PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.question}
                                            </span>
                                            <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-900">
                                              {phqaFunctionalImpairmentToOptionLabel(
                                                fa.questionnaireData![
                                                  PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.linkId
                                                ]
                                              )}
                                            </span>
                                          </li>
                                        </ul>
                                      </div>
                                    );
                                  })()
                                ) : fa.formQuestionnaireKey === PHQ9_QUESTIONNAIRE_KEY ? (
                                  (() => {
                                    const scores = computePHQ9Scores(fa.questionnaireData!);
                                    return (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                        <h4 className="text-sm font-semibold text-navy">PHQ-9 Scoring</h4>
                                        <div className="grid gap-2 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Total score:</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.total >= 10
                                                  ? "bg-amber-100 text-amber-900"
                                                  : "bg-gray-100 text-navy"
                                              }`}
                                            >
                                              {scores.total}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Depression severity:</span>
                                            <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                              {scores.severityLabel}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Suicide safety trigger:</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.suicideSafetyTrigger
                                                  ? "bg-red-100 text-red-900"
                                                  : "bg-green-100 text-green-900"
                                              }`}
                                            >
                                              {scores.suicideSafetyTrigger
                                                ? "Yes (item 9 is 1 or higher)"
                                                : "No"}
                                            </span>
                                          </div>
                                        </div>
                                        <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                        <ul className="space-y-2.5">
                                          {PHQ9_QUESTIONS.map((q, idx) => (
                                            <li
                                              key={q.linkId}
                                              className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                            >
                                              <span className="pr-3 leading-5 text-navy">
                                                {idx + 1}. {q.question}
                                              </span>
                                              <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                {phq9ResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })()
                                ) : fa.formQuestionnaireKey === SCARED_CHILD_QUESTIONNAIRE_KEY ? (
                                  (() => {
                                    const scores = computeScaredChildScores(fa.questionnaireData!);
                                    return (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                        <h4 className="text-sm font-semibold text-navy">SCARED Child Scoring</h4>
                                        <div className="grid gap-2 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Total score:</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.total >= 25
                                                  ? "bg-amber-100 text-amber-900"
                                                  : "bg-gray-100 text-navy"
                                              }`}
                                            >
                                              {scores.total}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Clinical cutoff (&gt;=25):</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.clinicallySignificantAnxiety
                                                  ? "bg-red-100 text-red-900"
                                                  : "bg-green-100 text-green-900"
                                              }`}
                                            >
                                              {scores.clinicallySignificantAnxiety ? "Meets cutoff" : "Below cutoff"}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-gray-700 sm:grid-cols-2">
                                            <p>Panic/Somatic: {scores.panicSomatic} (cutoff &gt;= 7)</p>
                                            <p>Generalized Anxiety: {scores.generalizedAnxiety} (cutoff &gt;= 9)</p>
                                            <p>Separation Anxiety: {scores.separationAnxiety} (cutoff &gt;= 5)</p>
                                            <p>Social Anxiety: {scores.socialAnxiety} (cutoff &gt;= 8)</p>
                                            <p>School Avoidance: {scores.schoolAvoidance} (cutoff &gt;= 3)</p>
                                          </div>
                                        </div>
                                        <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                        <ul className="space-y-2.5">
                                          {SCARED_CHILD_QUESTIONS.map((q, idx) => (
                                            <li
                                              key={q.linkId}
                                              className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                            >
                                              <span className="pr-3 leading-5 text-navy">
                                                {idx + 1}. {q.question}
                                              </span>
                                              <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                {scaredChildResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })()
                                ) : fa.formQuestionnaireKey === SCARED_PARENT_QUESTIONNAIRE_KEY ? (
                                  (() => {
                                    const scores = computeScaredParentScores(fa.questionnaireData!);
                                    return (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                        <h4 className="text-sm font-semibold text-navy">SCARED Parent Scoring</h4>
                                        <div className="grid gap-2 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Total score:</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.total >= 25
                                                  ? "bg-amber-100 text-amber-900"
                                                  : "bg-gray-100 text-navy"
                                              }`}
                                            >
                                              {scores.total}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Clinical cutoff (&gt;=25):</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.clinicallySignificantAnxiety
                                                  ? "bg-red-100 text-red-900"
                                                  : "bg-green-100 text-green-900"
                                              }`}
                                            >
                                              {scores.clinicallySignificantAnxiety ? "Meets cutoff" : "Below cutoff"}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-gray-700 sm:grid-cols-2">
                                            <p>Panic/Somatic: {scores.panicSomatic} (cutoff &gt;= 7)</p>
                                            <p>Generalized Anxiety: {scores.generalizedAnxiety} (cutoff &gt;= 9)</p>
                                            <p>Separation Anxiety: {scores.separationAnxiety} (cutoff &gt;= 5)</p>
                                            <p>Social Anxiety: {scores.socialAnxiety} (cutoff &gt;= 8)</p>
                                            <p>School Avoidance: {scores.schoolAvoidance} (cutoff &gt;= 3)</p>
                                          </div>
                                        </div>
                                        <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                        <ul className="space-y-2.5">
                                          {SCARED_PARENT_QUESTIONS.map((q, idx) => (
                                            <li
                                              key={q.linkId}
                                              className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                            >
                                              <span className="pr-3 leading-5 text-navy">
                                                {idx + 1}. {q.question}
                                              </span>
                                              <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                {scaredParentResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })()
                                ) : fa.formQuestionnaireKey === ADHD_PARENT_RATING_QUESTIONNAIRE_KEY ? (
                                  (() => {
                                    const ageYears = getPatientAgeYears();
                                    const scores = computeADHDParentScores(fa.questionnaireData!, ageYears);
                                    return (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                        <h4 className="text-sm font-semibold text-navy">ADHD Parent Rating Scoring</h4>
                                        <div className="grid gap-2 text-sm">
                                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-navy">Inattention count:</span>
                                              <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                                {scores.inattentiveCount}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-navy">Hyperactivity/Impulsivity count:</span>
                                              <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                                {scores.hyperactiveImpulsiveCount}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-navy">Inattention total:</span>
                                              <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                                {scores.inattentiveTotal}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-navy">Hyperactivity/Impulsivity total:</span>
                                              <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                                {scores.hyperactiveImpulsiveTotal}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Overall severity total:</span>
                                            <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">
                                              {scores.overallSeverityTotal}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Symptom threshold:</span>
                                            <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                              {scores.threshold.ageGroup === "unknown"
                                                ? "Unknown age (using >=6)"
                                                : scores.threshold.ageGroup === "child_or_teen_upto_16"
                                                  ? "Age <=16 (>=6)"
                                                  : "Age 17+ (>=5)"}
                                            </span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.meetsSymptomThreshold ? "bg-green-100 text-green-900" : "bg-gray-100 text-navy"
                                              }`}
                                            >
                                              {scores.meetsSymptomThreshold ? "Meets threshold" : "Below threshold"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Functional impairment present:</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.functionalImpairmentPresent ? "bg-red-100 text-red-900" : "bg-gray-100 text-navy"
                                              }`}
                                            >
                                              {scores.functionalImpairmentPresent ? "Yes (impact item >= 2)" : "No"}
                                            </span>
                                          </div>
                                        </div>

                                        <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                        <div className="space-y-4">
                                          <div>
                                            <p className="text-xs font-semibold text-gray-700 mb-2">Section A: Inattention</p>
                                            <ul className="space-y-2.5">
                                              {ADHD_PARENT_INATTENTION_QUESTIONS.map((q, idx) => (
                                                <li
                                                  key={q.linkId}
                                                  className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                                >
                                                  <span className="pr-3 leading-5 text-navy">
                                                    {idx + 1}. {q.question}
                                                  </span>
                                                  <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                    {adhdParentResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-gray-700 mb-2">Section B: Hyperactivity / Impulsivity</p>
                                            <ul className="space-y-2.5">
                                              {ADHD_PARENT_HYPERACTIVITY_QUESTIONS.map((q, idx) => (
                                                <li
                                                  key={q.linkId}
                                                  className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                                >
                                                  <span className="pr-3 leading-5 text-navy">
                                                    {idx + 10}. {q.question}
                                                  </span>
                                                  <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                    {adhdParentResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-gray-700 mb-2">Section C: Functional Impact</p>
                                            <ul className="space-y-2.5">
                                              {ADHD_PARENT_FUNCTIONAL_IMPACT_QUESTIONS.map((q) => (
                                                <li
                                                  key={q.linkId}
                                                  className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                                >
                                                  <span className="pr-3 leading-5 text-navy">{q.question}</span>
                                                  <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                    {adhdParentResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : fa.formQuestionnaireKey === ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY ? (
                                  (() => {
                                    const ageYears = getPatientAgeYears();
                                    const scores = computeADHDTeacherScores(fa.questionnaireData!, ageYears);
                                    return (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                        <h4 className="text-sm font-semibold text-navy">ADHD Teacher Rating Scoring</h4>
                                        <div className="grid gap-2 text-sm">
                                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-navy">Inattention count:</span>
                                              <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                                {scores.inattentiveCount}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-navy">Hyperactivity/Impulsivity count:</span>
                                              <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                                {scores.hyperactiveImpulsiveCount}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-navy">Inattention total:</span>
                                              <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                                {scores.inattentiveTotal}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-navy">Hyperactivity/Impulsivity total:</span>
                                              <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                                {scores.hyperactiveImpulsiveTotal}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Overall severity total:</span>
                                            <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">
                                              {scores.overallSeverityTotal}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Symptom threshold:</span>
                                            <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                              {scores.threshold.ageGroup === "unknown"
                                                ? "Unknown age (using >=6)"
                                                : scores.threshold.ageGroup === "child_or_teen_upto_16"
                                                  ? "Age <=16 (>=6)"
                                                  : "Age 17+ (>=5)"}
                                            </span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.meetsSymptomThreshold ? "bg-green-100 text-green-900" : "bg-gray-100 text-navy"
                                              }`}
                                            >
                                              {scores.meetsSymptomThreshold ? "Meets threshold" : "Below threshold"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Functional impairment present:</span>
                                            <span
                                              className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                                scores.functionalImpairmentPresent ? "bg-red-100 text-red-900" : "bg-gray-100 text-navy"
                                              }`}
                                            >
                                              {scores.functionalImpairmentPresent ? "Yes (impact item >= 2)" : "No"}
                                            </span>
                                          </div>
                                        </div>

                                        <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                        <div className="space-y-4">
                                          <div>
                                            <p className="text-xs font-semibold text-gray-700 mb-2">Section A: Inattention</p>
                                            <ul className="space-y-2.5">
                                              {ADHD_TEACHER_INATTENTION_QUESTIONS.map((q, idx) => (
                                                <li
                                                  key={q.linkId}
                                                  className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                                >
                                                  <span className="pr-3 leading-5 text-navy">
                                                    {idx + 1}. {q.question}
                                                  </span>
                                                  <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                    {adhdTeacherResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-gray-700 mb-2">Section B: Hyperactivity / Impulsivity</p>
                                            <ul className="space-y-2.5">
                                              {ADHD_TEACHER_HYPERACTIVITY_QUESTIONS.map((q, idx) => (
                                                <li
                                                  key={q.linkId}
                                                  className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                                >
                                                  <span className="pr-3 leading-5 text-navy">
                                                    {idx + 10}. {q.question}
                                                  </span>
                                                  <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                    {adhdTeacherResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-gray-700 mb-2">Section C: Functional Impact</p>
                                            <ul className="space-y-2.5">
                                              {ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS.map((q) => (
                                                <li
                                                  key={q.linkId}
                                                  className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                                >
                                                  <span className="pr-3 leading-5 text-navy">{q.question}</span>
                                                  <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                    {adhdTeacherResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  questionnaireToQandA(fa.questionnaireData!).map((qa, idx) => (
                                    <div key={idx} className="rounded border border-gray-200 bg-white p-3">
                                      <p className="text-xs font-medium text-gray-500">{qa.question}</p>
                                      <p className="mt-1 text-sm text-navy">{qa.answer}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                            {fa.formType === "questionnaire" && fa.fhirResponseId && !fa.questionnaireData && (
                              <p className="mt-2 text-xs text-amber-600">Response data could not be loaded.</p>
                            )}
                            {fa.downloadUrl && (
                              <div className="mt-2 flex flex-wrap gap-3">
                                <a href={fa.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cta hover:underline">
                                  View PDF →
                                </a>
                                <a href={fa.downloadUrl} download target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cta hover:underline">
                                  Download PDF →
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
            })}
            {overview.formAssignments.filter((fa) => !fa.appointmentId).length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Forms (general / before intake)</p>
                <div className="space-y-3">
                  {overview.formAssignments
                    .filter((fa) => !fa.appointmentId)
                    .map((fa) => {
                      const hasQuestionnaireData =
                        fa.formType === "questionnaire" &&
                        fa.questionnaireData &&
                        typeof fa.questionnaireData === "object" &&
                        Object.keys(fa.questionnaireData).length > 0;
                      const isExpanded = showFormResponses[fa.id];
                      return (
                        <div key={fa.id} className="rounded-lg border border-cream-200 bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-navy">{fa.formTitle}</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {fa.formType === "questionnaire" ? "Questionnaire" : "PDF Upload"}
                                {fa.assignedAt && <> · Assigned: {formatDate(fa.assignedAt)}</>}
                                {fa.completedAt && <> · Completed: {formatDate(fa.completedAt)}</>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  fa.status === "completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {fa.status === "completed" ? "Completed" : "Pending"}
                              </span>
                              {hasQuestionnaireData && (
                                <button
                                  type="button"
                                  onClick={() => setShowFormResponses((prev) => ({ ...prev, [fa.id]: !prev[fa.id] }))}
                                  className="text-sm font-medium text-cta hover:underline"
                                >
                                  {isExpanded ? "Hide" : "Show"} responses
                                </button>
                              )}
                            </div>
                          </div>
                          {hasQuestionnaireData && isExpanded && (
                            <div className="mt-4 space-y-4">
                              {fa.formQuestionnaireKey === PHQA_QUESTIONNAIRE_KEY ? (
                                (() => {
                                  const scores = computePHQAScores(fa.questionnaireData!);
                                  return (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                      <h4 className="text-sm font-semibold text-navy">PHQ-A Scoring</h4>
                                      <div className="grid gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Total score:</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.total >= 10
                                                ? "bg-amber-100 text-amber-900"
                                                : "bg-gray-100 text-navy"
                                            }`}
                                          >
                                            {scores.total}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Depression severity:</span>
                                          <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                            {scores.severityLabel}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Suicide safety trigger:</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.suicideSafetyTrigger
                                                ? "bg-red-100 text-red-900"
                                                : "bg-green-100 text-green-900"
                                            }`}
                                          >
                                            {scores.suicideSafetyTrigger
                                              ? "Yes (item 9 is 1 or higher)"
                                              : "No"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">
                                            Functional impairment (optional):
                                          </span>
                                          <span className="inline-flex rounded-md bg-purple-100 px-2 py-0.5 text-sm font-semibold text-purple-900">
                                            {phqaFunctionalImpairmentToOptionLabel(
                                              scores.functionalImpairment
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                      <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                      <ul className="space-y-2.5">
                                        {PHQA_QUESTIONS.map((q, idx) => (
                                          <li
                                            key={q.linkId}
                                            className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                          >
                                            <span className="pr-3 leading-5 text-navy">
                                              {idx + 1}. {q.question}
                                            </span>
                                            <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                              {phqaResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                            </span>
                                          </li>
                                        ))}
                                        <li className="flex items-start justify-between gap-3 rounded-md border border-purple-200 bg-purple-50/40 px-3 py-2 text-sm">
                                          <span className="pr-3 leading-5 text-navy">
                                            10. (Optional) {PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.question}
                                          </span>
                                          <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-900">
                                            {phqaFunctionalImpairmentToOptionLabel(
                                              fa.questionnaireData![
                                                PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.linkId
                                              ]
                                            )}
                                          </span>
                                        </li>
                                      </ul>
                                    </div>
                                  );
                                })()
                              ) : fa.formQuestionnaireKey === PHQ9_QUESTIONNAIRE_KEY ? (
                                (() => {
                                  const scores = computePHQ9Scores(fa.questionnaireData!);
                                  return (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                      <h4 className="text-sm font-semibold text-navy">PHQ-9 Scoring</h4>
                                      <div className="grid gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Total score:</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.total >= 10
                                                ? "bg-amber-100 text-amber-900"
                                                : "bg-gray-100 text-navy"
                                            }`}
                                          >
                                            {scores.total}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Depression severity:</span>
                                          <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                            {scores.severityLabel}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Suicide safety trigger:</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.suicideSafetyTrigger
                                                ? "bg-red-100 text-red-900"
                                                : "bg-green-100 text-green-900"
                                            }`}
                                          >
                                            {scores.suicideSafetyTrigger
                                              ? "Yes (item 9 is 1 or higher)"
                                              : "No"}
                                          </span>
                                        </div>
                                      </div>
                                      <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                      <ul className="space-y-2.5">
                                        {PHQ9_QUESTIONS.map((q, idx) => (
                                          <li
                                            key={q.linkId}
                                            className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                          >
                                            <span className="pr-3 leading-5 text-navy">
                                              {idx + 1}. {q.question}
                                            </span>
                                            <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                              {phq9ResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })()
                              ) : fa.formQuestionnaireKey === SCARED_CHILD_QUESTIONNAIRE_KEY ? (
                                (() => {
                                  const scores = computeScaredChildScores(fa.questionnaireData!);
                                  return (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                      <h4 className="text-sm font-semibold text-navy">SCARED Child Scoring</h4>
                                      <div className="grid gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Total score:</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.total >= 25
                                                ? "bg-amber-100 text-amber-900"
                                                : "bg-gray-100 text-navy"
                                            }`}
                                          >
                                            {scores.total}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Clinical cutoff (&gt;=25):</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.clinicallySignificantAnxiety
                                                ? "bg-red-100 text-red-900"
                                                : "bg-green-100 text-green-900"
                                            }`}
                                          >
                                            {scores.clinicallySignificantAnxiety ? "Meets cutoff" : "Below cutoff"}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-gray-700 sm:grid-cols-2">
                                          <p>Panic/Somatic: {scores.panicSomatic} (cutoff &gt;= 7)</p>
                                          <p>Generalized Anxiety: {scores.generalizedAnxiety} (cutoff &gt;= 9)</p>
                                          <p>Separation Anxiety: {scores.separationAnxiety} (cutoff &gt;= 5)</p>
                                          <p>Social Anxiety: {scores.socialAnxiety} (cutoff &gt;= 8)</p>
                                          <p>School Avoidance: {scores.schoolAvoidance} (cutoff &gt;= 3)</p>
                                        </div>
                                      </div>
                                      <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                      <ul className="space-y-2.5">
                                        {SCARED_CHILD_QUESTIONS.map((q, idx) => (
                                          <li
                                            key={q.linkId}
                                            className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                          >
                                            <span className="pr-3 leading-5 text-navy">
                                              {idx + 1}. {q.question}
                                            </span>
                                            <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                              {scaredChildResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })()
                              ) : fa.formQuestionnaireKey === SCARED_PARENT_QUESTIONNAIRE_KEY ? (
                                (() => {
                                  const scores = computeScaredParentScores(fa.questionnaireData!);
                                  return (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                      <h4 className="text-sm font-semibold text-navy">SCARED Parent Scoring</h4>
                                      <div className="grid gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Total score:</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.total >= 25
                                                ? "bg-amber-100 text-amber-900"
                                                : "bg-gray-100 text-navy"
                                            }`}
                                          >
                                            {scores.total}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Clinical cutoff (&gt;=25):</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.clinicallySignificantAnxiety
                                                ? "bg-red-100 text-red-900"
                                                : "bg-green-100 text-green-900"
                                            }`}
                                          >
                                            {scores.clinicallySignificantAnxiety ? "Meets cutoff" : "Below cutoff"}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-gray-700 sm:grid-cols-2">
                                          <p>Panic/Somatic: {scores.panicSomatic} (cutoff &gt;= 7)</p>
                                          <p>Generalized Anxiety: {scores.generalizedAnxiety} (cutoff &gt;= 9)</p>
                                          <p>Separation Anxiety: {scores.separationAnxiety} (cutoff &gt;= 5)</p>
                                          <p>Social Anxiety: {scores.socialAnxiety} (cutoff &gt;= 8)</p>
                                          <p>School Avoidance: {scores.schoolAvoidance} (cutoff &gt;= 3)</p>
                                        </div>
                                      </div>
                                      <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                      <ul className="space-y-2.5">
                                        {SCARED_PARENT_QUESTIONS.map((q, idx) => (
                                          <li
                                            key={q.linkId}
                                            className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                          >
                                            <span className="pr-3 leading-5 text-navy">
                                              {idx + 1}. {q.question}
                                            </span>
                                            <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                              {scaredParentResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })()
                              ) : fa.formQuestionnaireKey === ADHD_PARENT_RATING_QUESTIONNAIRE_KEY ? (
                                (() => {
                                  const ageYears = getPatientAgeYears();
                                  const scores = computeADHDParentScores(fa.questionnaireData!, ageYears);
                                  return (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                      <h4 className="text-sm font-semibold text-navy">ADHD Parent Rating Scoring</h4>
                                      <div className="grid gap-2 text-sm">
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Inattention count:</span>
                                            <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                              {scores.inattentiveCount}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Hyperactivity/Impulsivity count:</span>
                                            <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                              {scores.hyperactiveImpulsiveCount}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Inattention total:</span>
                                            <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                              {scores.inattentiveTotal}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Hyperactivity/Impulsivity total:</span>
                                            <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                              {scores.hyperactiveImpulsiveTotal}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Overall severity total:</span>
                                          <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">
                                            {scores.overallSeverityTotal}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Symptom threshold:</span>
                                          <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                            {scores.threshold.ageGroup === "unknown"
                                              ? "Unknown age (using >=6)"
                                              : scores.threshold.ageGroup === "child_or_teen_upto_16"
                                                ? "Age <=16 (>=6)"
                                                : "Age 17+ (>=5)"}
                                          </span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.meetsSymptomThreshold ? "bg-green-100 text-green-900" : "bg-gray-100 text-navy"
                                            }`}
                                          >
                                            {scores.meetsSymptomThreshold ? "Meets threshold" : "Below threshold"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Functional impairment present:</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.functionalImpairmentPresent ? "bg-red-100 text-red-900" : "bg-gray-100 text-navy"
                                            }`}
                                          >
                                            {scores.functionalImpairmentPresent ? "Yes (impact item >= 2)" : "No"}
                                          </span>
                                        </div>
                                      </div>

                                      <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                      <div className="space-y-4">
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-2">Section A: Inattention</p>
                                          <ul className="space-y-2.5">
                                            {ADHD_PARENT_INATTENTION_QUESTIONS.map((q, idx) => (
                                              <li
                                                key={q.linkId}
                                                className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                              >
                                                <span className="pr-3 leading-5 text-navy">
                                                  {idx + 1}. {q.question}
                                                </span>
                                                <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                  {adhdParentResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-2">Section B: Hyperactivity / Impulsivity</p>
                                          <ul className="space-y-2.5">
                                            {ADHD_PARENT_HYPERACTIVITY_QUESTIONS.map((q, idx) => (
                                              <li
                                                key={q.linkId}
                                                className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                              >
                                                <span className="pr-3 leading-5 text-navy">
                                                  {idx + 10}. {q.question}
                                                </span>
                                                <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                  {adhdParentResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-2">Section C: Functional Impact</p>
                                          <ul className="space-y-2.5">
                                            {ADHD_PARENT_FUNCTIONAL_IMPACT_QUESTIONS.map((q) => (
                                              <li
                                                key={q.linkId}
                                                className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                              >
                                                <span className="pr-3 leading-5 text-navy">{q.question}</span>
                                                <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                  {adhdParentResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : fa.formQuestionnaireKey === ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY ? (
                                (() => {
                                  const ageYears = getPatientAgeYears();
                                  const scores = computeADHDTeacherScores(fa.questionnaireData!, ageYears);
                                  return (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                                      <h4 className="text-sm font-semibold text-navy">ADHD Teacher Rating Scoring</h4>
                                      <div className="grid gap-2 text-sm">
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Inattention count:</span>
                                            <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                              {scores.inattentiveCount}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Hyperactivity/Impulsivity count:</span>
                                            <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                              {scores.hyperactiveImpulsiveCount}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Inattention total:</span>
                                            <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                              {scores.inattentiveTotal}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-navy">Hyperactivity/Impulsivity total:</span>
                                            <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-900">
                                              {scores.hyperactiveImpulsiveTotal}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Overall severity total:</span>
                                          <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">
                                            {scores.overallSeverityTotal}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Symptom threshold:</span>
                                          <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-navy">
                                            {scores.threshold.ageGroup === "unknown"
                                              ? "Unknown age (using >=6)"
                                              : scores.threshold.ageGroup === "child_or_teen_upto_16"
                                                ? "Age <=16 (>=6)"
                                                : "Age 17+ (>=5)"}
                                          </span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.meetsSymptomThreshold ? "bg-green-100 text-green-900" : "bg-gray-100 text-navy"
                                            }`}
                                          >
                                            {scores.meetsSymptomThreshold ? "Meets threshold" : "Below threshold"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-navy">Functional impairment present:</span>
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${
                                              scores.functionalImpairmentPresent ? "bg-red-100 text-red-900" : "bg-gray-100 text-navy"
                                            }`}
                                          >
                                            {scores.functionalImpairmentPresent ? "Yes (impact item >= 2)" : "No"}
                                          </span>
                                        </div>
                                      </div>

                                      <h4 className="text-sm font-semibold text-navy pt-2 border-t border-gray-200">Responses</h4>
                                      <div className="space-y-4">
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-2">Section A: Inattention</p>
                                          <ul className="space-y-2.5">
                                            {ADHD_TEACHER_INATTENTION_QUESTIONS.map((q, idx) => (
                                              <li
                                                key={q.linkId}
                                                className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                              >
                                                <span className="pr-3 leading-5 text-navy">
                                                  {idx + 1}. {q.question}
                                                </span>
                                                <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                  {adhdTeacherResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-2">Section B: Hyperactivity / Impulsivity</p>
                                          <ul className="space-y-2.5">
                                            {ADHD_TEACHER_HYPERACTIVITY_QUESTIONS.map((q, idx) => (
                                              <li
                                                key={q.linkId}
                                                className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                              >
                                                <span className="pr-3 leading-5 text-navy">
                                                  {idx + 10}. {q.question}
                                                </span>
                                                <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                  {adhdTeacherResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-2">Section C: Functional Impact</p>
                                          <ul className="space-y-2.5">
                                            {ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS.map((q) => (
                                              <li
                                                key={q.linkId}
                                                className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                              >
                                                <span className="pr-3 leading-5 text-navy">{q.question}</span>
                                                <span className="mt-0.5 inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-navy">
                                                  {adhdTeacherResponseToOptionLabel(fa.questionnaireData![q.linkId])}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                questionnaireToQandA(fa.questionnaireData!).map((qa, idx) => (
                                  <div key={idx} className="rounded border border-gray-200 bg-gray-50 p-3">
                                    <p className="text-xs font-medium text-gray-500">{qa.question}</p>
                                    <p className="mt-1 text-sm text-navy">{qa.answer}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                          {fa.formType === "questionnaire" && fa.fhirResponseId && !fa.questionnaireData && (
                            <p className="mt-2 text-xs text-amber-600">Response data could not be loaded.</p>
                          )}
                          {fa.downloadUrl && (
                            <div className="mt-2 flex flex-wrap gap-3">
                              <a href={fa.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cta hover:underline">
                                View PDF →
                              </a>
                              <a href={fa.downloadUrl} download target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cta hover:underline">
                                Download PDF →
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AssignFormsModal
        isOpen={assignFormsOpen}
        onClose={() => {
          setAssignFormsOpen(false);
          setAssignFormsForAppointmentId(null);
        }}
        patientId={patientId}
        appointmentId={assignFormsForAppointmentId}
        onSuccess={() => {
          setAssignFormsOpen(false);
          setAssignFormsForAppointmentId(null);
          loadOverview();
        }}
      />
      <ScheduleClinicalIntakeModal
        isOpen={scheduleClinicalIntakeOpen}
        onClose={() => {
          setScheduleClinicalIntakeOpen(false);
          setAssignFormsAfterSchedule(false);
        }}
        patientId={patientId}
        patientName={overview.patientName}
        onSuccess={(appointmentId) => {
          setScheduleClinicalIntakeOpen(false);
          loadOverview();
          if (assignFormsAfterSchedule && appointmentId) {
            setAssignFormsForAppointmentId(appointmentId);
            setAssignFormsOpen(true);
            setAssignFormsAfterSchedule(false);
          }
        }}
      />
      <ScheduleFollowupModal
        isOpen={scheduleFollowupOpen}
        onClose={() => setScheduleFollowupOpen(false)}
        patientId={patientId}
        patientName={overview.patientName}
        allowedTypes={followupAllowedTypes}
        onSuccess={() => {
          setScheduleFollowupOpen(false);
          loadOverview();
        }}
      />
      <RescheduleModal
        isOpen={!!rescheduleAppointment}
        onClose={() => setRescheduleAppointment(null)}
        appointmentId={rescheduleAppointment?.id ?? ""}
        durationMinutes={rescheduleAppointment?.durationMinutes ?? 30}
        appointmentType={rescheduleAppointment?.type}
        variant={rescheduleAppointment?.status === "pending_confirmation" ? "change-proposed-time" : "reschedule"}
        onSuccess={() => {
          loadOverview();
          setRescheduleAppointment(null);
        }}
      />
      <ConfirmChargeModal
        isOpen={!!chargeConfirmAppointment}
        onClose={() => setChargeConfirmAppointment(null)}
        appointment={
          chargeConfirmAppointment
            ? {
                id: chargeConfirmAppointment.id,
                type: chargeConfirmAppointment.type,
                scheduledAt: chargeConfirmAppointment.scheduledAt,
                durationMinutes: chargeConfirmAppointment.durationMinutes,
                patient: overview ? { name: overview.patientName } : undefined,
              }
            : null
        }
        onSuccess={() => {
          loadOverview();
          setChargeConfirmAppointment(null);
        }}
      />
    </main>
    </div>
  );
}
