"use client";

import { useEffect, useState } from "react";

type Form = {
  id: string;
  title: string;
  description: string | null;
  type: string; // "questionnaire" | "pdf_upload"
  questionnaireKey: string | null;
  templateGcsPath: string | null;
  isActive: boolean;
};

type AssignFormsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId: string | null;
  onSuccess?: () => void;
};

export default function AssignFormsModal({
  isOpen,
  onClose,
  patientId,
  appointmentId,
  onSuccess,
}: AssignFormsModalProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadForms();
    } else {
      // Reset state when modal closes
      setSelectedFormIds(new Set());
      setError(null);
    }
  }, [isOpen]);

  async function loadForms() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/patient-forms/forms", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load forms");
      }
      const data = await res.json();
      setForms(data);
    } catch (err) {
      setError("Failed to load forms. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleForm(formId: string) {
    setSelectedFormIds((prev) => {
      const next = new Set(prev);
      if (next.has(formId)) {
        next.delete(formId);
      } else {
        next.add(formId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedFormIds.size === 0) {
      setError("Please select at least one form to assign.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/patient-forms/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId,
          formIds: Array.from(selectedFormIds),
          appointmentId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to assign forms");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign forms. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="border-b-2 border-gray-200 bg-gray-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-semibold text-navy">Assign Forms to Patient</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Select forms the patient needs to complete before their appointment.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form list */}
        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10 text-gray-400">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading forms…
            </div>
          ) : error && !submitting ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          ) : forms.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-center">
              <p className="text-sm font-medium text-amber-900">No forms available</p>
              <p className="mt-1 text-xs text-amber-700">
                No forms have been added to the system yet. Run the form seed script from the backend to add forms.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {forms.map((form) => {
                const isSelected = selectedFormIds.has(form.id);
                return (
                  <label
                    key={form.id}
                    className={`group flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all duration-150 ${
                      isSelected
                        ? "border-cta bg-cta/5 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {/* Custom checkbox */}
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                      isSelected ? "border-cta bg-cta" : "border-gray-300 bg-white group-hover:border-cta/50"
                    }`}>
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleForm(form.id)}
                      className="sr-only"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`font-medium leading-snug ${isSelected ? "text-navy" : "text-gray-800"}`}>
                          {form.title}
                        </p>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          form.type === "questionnaire"
                            ? "bg-cta/10 text-cta"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {form.type === "questionnaire" ? "Questionnaire" : "PDF Upload"}
                        </span>
                      </div>
                      {form.description && (
                        <p className="mt-1 text-sm text-gray-500 leading-snug">{form.description}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 bg-gray-50 px-6 py-4">
          {error && submitting && (
            <p className="mb-3 text-sm text-red-600">{error}</p>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {selectedFormIds.size > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cta/10 px-3 py-1 text-xs font-medium text-cta">
                  <span className="h-1.5 w-1.5 rounded-full bg-cta" />
                  {selectedFormIds.size} form{selectedFormIds.size === 1 ? "" : "s"} selected
                </span>
              ) : (
                <span className="text-sm text-gray-400">No forms selected</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || selectedFormIds.size === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-40 transition-colors"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Assigning…
                  </>
                ) : "Assign Forms"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
