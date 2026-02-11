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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Assign Forms to Patient</h2>
          <p className="mt-1 text-sm text-gray-600">
            Select forms that the patient needs to complete before their next appointment.
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-center text-gray-500">Loading forms…</p>
          ) : error && !submitting ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : forms.length === 0 ? (
            <p className="text-center text-gray-500">No forms available.</p>
          ) : (
            <div className="space-y-3">
              {forms.map((form) => {
                const isSelected = selectedFormIds.has(form.id);
                return (
                  <label
                    key={form.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                      isSelected
                        ? "border-warm-brown bg-cream-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleForm(form.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-warm-brown focus:ring-warm-brown"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{form.title}</p>
                          {form.description && (
                            <p className="mt-1 text-sm text-gray-600">{form.description}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                            form.type === "questionnaire"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {form.type === "questionnaire" ? "Questionnaire" : "PDF Upload"}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              {selectedFormIds.size > 0
                ? `${selectedFormIds.size} form${selectedFormIds.size === 1 ? "" : "s"} selected`
                : "Select forms to assign"}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || selectedFormIds.size === 0}
                className="rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
              >
                {submitting ? "Assigning…" : "Assign Forms"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
