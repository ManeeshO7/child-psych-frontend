"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { questionnaireToQandA } from "@/lib/questionnaireLabels";
import AssignFormsModal from "@/components/AssignFormsModal";
import ScheduleClinicalIntakeModal from "@/components/ScheduleClinicalIntakeModal";
import ScheduleFollowupModal from "@/components/ScheduleFollowupModal";

type PatientOverview = {
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string | null;
  address?: string | null;
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
  }>;
  formAssignments: Array<{
    id: string;
    formId: string;
    formTitle: string;
    formType: string;
    status: string;
    assignedAt: string;
    completedAt: string | null;
    fhirResponseId: string | null;
    questionnaireData?: Record<string, unknown> | null;
    uploadedGcsPath: string | null;
    downloadUrl: string | null;
  }>;
  intakeSubmission: {
    id: string;
    formData: any;
    status: string;
    reviewedAt: string | null;
  } | null;
};

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
  const [scheduleClinicalIntakeOpen, setScheduleClinicalIntakeOpen] = useState(false);
  const [scheduleFollowupOpen, setScheduleFollowupOpen] = useState(false);
  const [followupAllowedTypes, setFollowupAllowedTypes] = useState<string[]>(["followup_med_30", "followup_med_therapy_45"]);

  useEffect(() => {
    if (patientId) {
      loadOverview();
    }
  }, [patientId]);

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

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading patient overview…</p>
      </main>
    );
  }

  if (error || !overview) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/doctor/patients" className="text-sm text-warm-brown hover:underline">
          ← Back to patients
        </Link>
      </p>

      <h1 className="section-heading">Patient Overview</h1>

      <div className="mt-6 card">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Patient Information</h2>
        <div className="space-y-1 text-sm">
          <p><span className="font-medium text-gray-700">Name:</span> {overview.patientName}</p>
          <p><span className="font-medium text-gray-700">Email:</span> {overview.patientEmail}</p>
          {overview.patientPhone != null && overview.patientPhone !== "" && (
            <p><span className="font-medium text-gray-700">Phone:</span> {overview.patientPhone}</p>
          )}
          {overview.address != null && overview.address !== "" && (
            <p><span className="font-medium text-gray-700">Address:</span> {overview.address}</p>
          )}
        </div>
      </div>

      {/* Action reminders - same logic as completed appointments list */}
      {(() => {
        const completedOrientation = overview.appointments.find(
          (a) => a.type === "orientation_consult" && a.status === "completed"
        );
        const hasAssignedForms = overview.formAssignments.length > 0;
        // Has any clinical intake (pending, scheduled, or completed) — hide "Schedule clinical intake" once they have one
        const hasClinicalIntake = overview.appointments.some(
          (a) => a.type === "clinical_intake" && a.status !== "cancelled"
        );
        const completedClinicalIntake = overview.appointments.find(
          (a) => (a.type === "clinical_intake" || a.type === "intake") && a.status === "completed"
        );

        const showAssignForms = completedOrientation && !hasAssignedForms;
        const showScheduleClinicalIntake = completedOrientation && !hasClinicalIntake;
        const showScheduleFollowup = !!completedClinicalIntake;

        if (!showAssignForms && !showScheduleClinicalIntake && !showScheduleFollowup) return null;

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
                        <p className="font-medium text-gray-900">Assign forms</p>
                        <p className="text-sm text-gray-600">
                          Orientation completed. Assign forms for the patient to complete before clinical intake.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAssignFormsOpen(true)}
                        className="inline-flex rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
                      >
                        Assign forms →
                      </button>
                    </li>
                  )}
                  {showScheduleClinicalIntake && (
                    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-4">
                      <div>
                        <p className="font-medium text-gray-900">Schedule clinical intake</p>
                        <p className="text-sm text-gray-600">
                          Schedule a 60-minute clinical intake appointment for this patient.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScheduleClinicalIntakeOpen(true)}
                        className="inline-flex rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
                      >
                        Schedule clinical intake →
                      </button>
                    </li>
                  )}
                  {showScheduleFollowup && (
                    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-4">
                      <div>
                        <p className="font-medium text-gray-900">Schedule follow-up</p>
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
                            setFollowupAllowedTypes(data.allowedTypes ?? ["followup_med_30", "followup_med_therapy_45"]);
                          } catch {
                            setFollowupAllowedTypes(["followup_med_30", "followup_med_therapy_45"]);
                          }
                          setScheduleFollowupOpen(true);
                        }}
                        className="inline-flex rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90"
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
            <h2 className="text-lg font-semibold text-gray-900">Pre-screening questionnaire</h2>
            {overview.patientRequest.questionnaireData && 
             typeof overview.patientRequest.questionnaireData === 'object' &&
             Object.keys(overview.patientRequest.questionnaireData).length > 0 && (
              <button
                type="button"
                onClick={() => setShowQuestionnaire(!showQuestionnaire)}
                className="flex items-center gap-1 text-sm font-medium text-warm-brown hover:underline"
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
                  <p className="mt-1 text-sm text-gray-900">{qa.answer}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Intake Submission</h2>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h2>
        {overview.appointments.length === 0 ? (
          <p className="text-sm text-gray-600">No appointments yet.</p>
        ) : (
          <div className="space-y-3">
            {overview.appointments.map((apt) => (
              <div key={apt.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{formatDate(apt.scheduledAt)}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {apt.type} · {apt.status}
                    </p>
                    {apt.meetLink && (
                      <a
                        href={apt.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-warm-brown hover:underline"
                      >
                        Join video call →
                      </a>
                    )}
                    {apt.notes && (
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {apt.notes}
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
                    {apt.status === "card_on_file" ? "Card on file" : apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Form Assignments</h2>
        {overview.formAssignments.length === 0 ? (
          <p className="text-sm text-gray-600">No forms assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {overview.formAssignments.map((fa) => {
              const hasQuestionnaireData = fa.formType === "questionnaire" &&
                fa.questionnaireData && typeof fa.questionnaireData === "object" &&
                Object.keys(fa.questionnaireData).length > 0;
              const isExpanded = showFormResponses[fa.id];

              return (
              <div key={fa.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{fa.formTitle}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          Type: {fa.formType === "questionnaire" ? "Questionnaire" : "PDF Upload"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Assigned: {formatDate(fa.assignedAt)}
                          {fa.completedAt && <> · Completed: {formatDate(fa.completedAt)}</>}
                        </p>
                      </div>
                      {hasQuestionnaireData && (
                        <button
                          type="button"
                          onClick={() => setShowFormResponses((prev) => ({ ...prev, [fa.id]: !prev[fa.id] }))}
                          className="flex items-center gap-1 text-sm font-medium text-warm-brown hover:underline"
                        >
                          {isExpanded ? "Hide" : "Show"} responses
                          <svg
                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {hasQuestionnaireData && isExpanded && (
                      <div className="mt-4 space-y-3">
                        {questionnaireToQandA(fa.questionnaireData!).map((qa, idx) => (
                          <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-xs font-medium text-gray-500">{qa.question}</p>
                            <p className="mt-1 text-sm text-gray-900">{qa.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {fa.formType === "questionnaire" && fa.fhirResponseId && !fa.questionnaireData && (
                      <p className="mt-2 text-xs text-amber-600">
                        Response data could not be loaded. FHIR ID: {fa.fhirResponseId}
                      </p>
                    )}
                    {fa.downloadUrl && (
                      <div className="mt-2 flex flex-wrap gap-3">
                        <a
                          href={fa.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-warm-brown hover:underline"
                        >
                          View PDF →
                        </a>
                        <a
                          href={fa.downloadUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-warm-brown hover:underline"
                        >
                          Download PDF →
                        </a>
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                      fa.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {fa.status === "completed" ? "Completed" : "Pending"}
                  </span>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>

      <AssignFormsModal
        isOpen={assignFormsOpen}
        onClose={() => setAssignFormsOpen(false)}
        patientId={patientId}
        appointmentId={overview.appointments.find((a) => a.type === "orientation_consult" && a.status === "completed")?.id ?? null}
        onSuccess={() => {
          setAssignFormsOpen(false);
          loadOverview();
        }}
      />
      <ScheduleClinicalIntakeModal
        isOpen={scheduleClinicalIntakeOpen}
        onClose={() => setScheduleClinicalIntakeOpen(false)}
        patientId={patientId}
        patientName={overview.patientName}
        onSuccess={() => {
          setScheduleClinicalIntakeOpen(false);
          loadOverview();
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
    </main>
  );
}
