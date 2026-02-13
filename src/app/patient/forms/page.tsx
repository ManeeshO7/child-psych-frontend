"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FormAssignment = {
  id: string;
  formId: string;
  form: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    questionnaireKey: string | null;
  };
  status: string; // "pending" | "completed"
  assignedAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  uploadUrl: string | null;
};

export default function PatientFormsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    loadAssignments();
  }, []);

  function showNotice(type: "success" | "error", message: string) {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  }

  async function loadAssignments() {
    setLoading(true);
    try {
      const res = await fetch("/api/patient-forms/my-forms", {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load forms");
      }
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      console.error(err);
      showNotice("error", "Failed to load forms. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuestionnaireSubmit(assignmentId: string, formKey: string) {
    const responses = questionnaireResponses[assignmentId];
    if (!responses || Object.keys(responses).length === 0) {
      showNotice("error", "Please fill out the questionnaire before submitting.");
      return;
    }

    setSubmitting(assignmentId);
    try {
      const res = await fetch("/api/patient-forms/submit-questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assignmentId,
          responses,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to submit questionnaire");
      }

      showNotice("success", "Questionnaire submitted successfully!");
      loadAssignments();
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to submit questionnaire.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handlePdfUpload(assignmentId: string, file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showNotice("error", "Please upload a PDF file.");
      return;
    }

    setUploading(assignmentId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/patient-forms/upload-pdf/${assignmentId}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to upload PDF");
      }

      showNotice("success", "PDF uploaded successfully!");
      loadAssignments();
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to upload PDF.");
    } finally {
      setUploading(null);
    }
  }

  function updateQuestionnaireResponse(assignmentId: string, key: string, value: any) {
    setQuestionnaireResponses((prev) => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [key]: value,
      },
    }));
  }

  function renderQuestionnaireForm(assignment: FormAssignment) {
    const formKey = assignment.form.questionnaireKey || "default";
    const responses = questionnaireResponses[assignment.id] || {};

    // Simple questionnaire UI - in production, you'd load the actual form definition
    // For now, we'll create a basic form based on common fields
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            How are you feeling today?
          </label>
          <textarea
            value={responses.moodToday || ""}
            onChange={(e) => updateQuestionnaireResponse(assignment.id, "moodToday", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="Describe your current mood and feelings..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Any concerns or questions?
          </label>
          <textarea
            value={responses.concerns || ""}
            onChange={(e) => updateQuestionnaireResponse(assignment.id, "concerns", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="Share any concerns or questions..."
          />
        </div>
        <button
          type="button"
          onClick={() => handleQuestionnaireSubmit(assignment.id, formKey)}
          disabled={submitting === assignment.id}
          className="rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
        >
          {submitting === assignment.id ? "Submitting…" : "Submit Questionnaire"}
        </button>
      </div>
    );
  }

  function renderPdfForm(assignment: FormAssignment) {
    return (
      <div className="space-y-4">
        {assignment.downloadUrl && (
          <div>
            <a
              href={assignment.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Template PDF
            </a>
          </div>
        )}
        {assignment.status === "pending" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Completed PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handlePdfUpload(assignment.id, file);
                }
              }}
              disabled={uploading === assignment.id}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-warm-brown file:text-white hover:file:bg-warm-brown/90 disabled:opacity-50"
            />
            {uploading === assignment.id && (
              <p className="mt-2 text-sm text-gray-600">Uploading…</p>
            )}
          </div>
        )}
      </div>
    );
  }

  const pendingCount = assignments.filter((a) => a.status === "pending").length;
  const completedCount = assignments.filter((a) => a.status === "completed").length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {notice && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`w-full max-w-xl rounded-lg border px-4 py-3 shadow-lg ${
              notice.type === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{notice.message}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-sm opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mb-6">
        <Link href="/patient" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>

      <h1 className="section-heading">Forms & Documents</h1>
      <p className="mt-2 text-gray-600">
        Complete the forms assigned by your doctor before booking your next appointment.
      </p>

      {pendingCount > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            You have {pendingCount} pending form{pendingCount === 1 ? "" : "s"} to complete.
          </p>
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-gray-500">Loading forms…</p>
      ) : assignments.length === 0 ? (
        <div className="mt-10 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No forms have been assigned to you yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            After your orientation consult, your doctor will assign forms for you to complete. They will appear here.
          </p>
          <Link
            href="/patient"
            className="mt-4 inline-block text-sm font-medium text-warm-brown hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {pendingCount > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Forms</h2>
              <div className="space-y-4">
                {assignments
                  .filter((a) => a.status === "pending")
                  .map((assignment) => (
                    <div key={assignment.id} className="card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.form.title}
                          </h3>
                          {assignment.form.description && (
                            <p className="mt-1 text-sm text-gray-600">{assignment.form.description}</p>
                          )}
                          <div className="mt-4">
                            {assignment.form.type === "questionnaire"
                              ? renderQuestionnaireForm(assignment)
                              : renderPdfForm(assignment)}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {completedCount > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Completed Forms</h2>
              <div className="space-y-4">
                {assignments
                  .filter((a) => a.status === "completed")
                  .map((assignment) => (
                    <div key={assignment.id} className="card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.form.title}
                          </h3>
                          {assignment.form.description && (
                            <p className="mt-1 text-sm text-gray-600">{assignment.form.description}</p>
                          )}
                          {assignment.completedAt && (
                            <p className="mt-2 text-xs text-gray-500">
                              Completed on {new Date(assignment.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                          Completed
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
