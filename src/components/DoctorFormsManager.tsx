"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { QUESTIONNAIRE_CATALOG } from "@/lib/questionnaireCatalog";

type FormRecord = {
  id: string;
  title: string;
  description: string | null;
  type: "questionnaire" | "pdf_upload" | string;
  questionnaireKey: string | null;
  templateGcsPath: string | null;
  isActive: boolean;
};

function typeBadge(type: string) {
  if (type === "pdf_upload") {
    return <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">PDF Upload</span>;
  }
  return <span className="rounded-full bg-cta/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cta">Questionnaire</span>;
}

export default function DoctorFormsManager() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingForm, setEditingForm] = useState<FormRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showNewPdfForm, setShowNewPdfForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/patient-forms/forms?includeInactive=true", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/doctor/login";
        return;
      }
      if (!res.ok) {
        setLoadError("Could not load forms.");
        return;
      }
      const data = await res.json();
      setForms(Array.isArray(data) ? data : []);
    } catch {
      setLoadError("Could not load forms. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(form: FormRecord) {
    setEditingForm(form);
    setEditTitle(form.title);
    setEditDescription(form.description || "");
    setEditError(null);
  }

  async function saveEdit() {
    if (!editingForm) return;
    const title = editTitle.trim();
    if (!title) {
      setEditError("Title is required.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/patient-forms/forms/${editingForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, description: editDescription.trim() || null }),
      });
      if (res.status === 401) {
        window.location.href = "/doctor/login";
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setEditError(err.detail || "Failed to save changes.");
        return;
      }
      const updated = await res.json();
      setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setEditingForm(null);
      showToast("Form updated.");
    } catch {
      setEditError("Could not save. Is the backend running?");
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleActive(form: FormRecord) {
    setTogglingId(form.id);
    try {
      const res = await fetch(`/api/patient-forms/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !form.isActive }),
      });
      if (res.status === 401) {
        window.location.href = "/doctor/login";
        return;
      }
      if (!res.ok) {
        showToast("Failed to update form status.");
        return;
      }
      const updated = await res.json();
      setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      showToast(updated.isActive ? "Form activated." : "Form deactivated.");
    } catch {
      showToast("Could not save. Is the backend running?");
    } finally {
      setTogglingId(null);
    }
  }

  function resetNewPdfForm() {
    setNewTitle("");
    setNewDescription("");
    setNewFile(null);
    setNewError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function createPdfForm() {
    const title = newTitle.trim();
    if (!title) {
      setNewError("Title is required.");
      return;
    }
    if (!newFile) {
      setNewError("Please choose a blank PDF template to upload.");
      return;
    }
    if (!newFile.name.toLowerCase().endsWith(".pdf")) {
      setNewError("Only PDF files are allowed.");
      return;
    }
    setNewSaving(true);
    setNewError(null);
    try {
      const fd = new FormData();
      fd.append("title", title);
      if (newDescription.trim()) fd.append("description", newDescription.trim());
      fd.append("file", newFile);
      const res = await fetch("/api/patient-forms/forms/pdf", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (res.status === 401) {
        window.location.href = "/doctor/login";
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setNewError(err.detail || "Failed to create form.");
        return;
      }
      const created = await res.json();
      setForms((prev) => [created, ...prev]);
      setShowNewPdfForm(false);
      resetNewPdfForm();
      showToast("New PDF form created.");
    } catch {
      setNewError("Could not save. Is the backend running?");
    } finally {
      setNewSaving(false);
    }
  }

  const activeForms = forms.filter((f) => f.isActive);
  const inactiveForms = forms.filter((f) => !f.isActive);

  function formCard(form: FormRecord) {
    const catalogEntry = form.questionnaireKey ? QUESTIONNAIRE_CATALOG[form.questionnaireKey] : null;
    const isExpanded = expandedId === form.id;
    const totalQuestions = catalogEntry ? catalogEntry.sections.reduce((n, s) => n + s.questions.length, 0) : 0;

    return (
      <div
        key={form.id}
        className={`rounded-xl border px-5 py-4 transition ${
          form.isActive ? "border-cream-200 bg-white dark:border-neutral-700 dark:bg-neutral-800" : "border-cream-200 bg-cream-50/60 opacity-70 dark:border-neutral-700 dark:bg-neutral-900"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-navy dark:text-cream-100">{form.title}</p>
              {typeBadge(form.type)}
              {!form.isActive && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-neutral-700 dark:text-gray-400">
                  Inactive
                </span>
              )}
            </div>
            {form.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{form.description}</p>}
            {form.type === "pdf_upload" && !form.templateGcsPath && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No template file on record.</p>
            )}
            {catalogEntry && (
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : form.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cta hover:underline"
              >
                <svg
                  className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {isExpanded ? "Hide questions" : `View questions (${totalQuestions})`}
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(form)}
              className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-cream-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => toggleActive(form)}
              disabled={togglingId === form.id}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition disabled:opacity-60 ${
                form.isActive
                  ? "border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                  : "border border-cta/30 bg-cta/10 text-cta hover:bg-cta/20"
              }`}
            >
              {togglingId === form.id ? "Saving…" : form.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>

        {isExpanded && catalogEntry && (
          <div className="mt-4 space-y-4 border-t border-cream-100 pt-4 dark:border-neutral-700">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-400">Timeframe: {catalogEntry.timeframe}</p>
            {catalogEntry.sections.map((section, sIdx) => (
              <div key={sIdx}>
                {section.label && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{section.label}</p>
                )}
                <ol className="list-decimal space-y-1.5 pl-5">
                  {section.questions.map((q) => (
                    <li key={q.linkId} className="text-sm text-gray-700 dark:text-gray-300">
                      {q.question}
                    </li>
                  ))}
                </ol>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {section.options.map((opt) => (
                    <span
                      key={opt.value}
                      className="rounded-full border border-cream-200 bg-cream-50 px-2.5 py-0.5 text-[11px] text-gray-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-400"
                    >
                      {opt.value} = {opt.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream-50/60 dark:bg-neutral-900">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/doctor" className="inline-flex items-center gap-1 text-sm text-cta hover:underline mb-3">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40">
                <svg className="h-5 w-5 text-violet-600 dark:text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy dark:text-cream-100">Manage Forms</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Edit existing forms or add a new PDF form for patients.</p>
              </div>
            </div>
          </div>

          {!showNewPdfForm && (
            <button
              type="button"
              onClick={() => setShowNewPdfForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cta px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
            >
              + New PDF Form
            </button>
          )}
        </div>

        {showNewPdfForm && (
          <div className="mb-6 rounded-2xl border border-cta/30 bg-cta/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">New PDF form</h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Upload a blank PDF template. Patients will download it, fill it out, and upload the completed file back.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Release of Information Form"
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-cream-100 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">Description (optional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Briefly describe what this form is for."
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-cream-100 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">Blank PDF template</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-cta file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90 dark:text-gray-300"
                />
              </div>

              {newError && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {newError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={createPdfForm}
                  disabled={newSaving}
                  className="rounded-xl bg-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:opacity-60"
                >
                  {newSaving ? "Creating…" : "Create form"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPdfForm(false);
                    resetNewPdfForm();
                  }}
                  className="rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-cream-50 hover:text-gray-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="h-7 w-7 animate-spin text-cta" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">{loadError}</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Active forms ({activeForms.length})</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Visible to you when assigning forms to a patient.</p>
              {activeForms.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-cream-300 bg-cream-50 p-6 text-center dark:border-neutral-600 dark:bg-neutral-900">
                  <p className="text-sm text-gray-400 dark:text-gray-500">No active forms.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">{activeForms.map(formCard)}</div>
              )}
            </div>

            {inactiveForms.length > 0 && (
              <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Inactive forms ({inactiveForms.length})</h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Hidden from the assign-forms picker. Past assignments and answers are kept.</p>
                <div className="mt-4 space-y-3">{inactiveForms.map(formCard)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
            <h2 className="text-base font-semibold text-navy dark:text-cream-100">Edit form</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-cream-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-cream-100"
                />
              </div>
              {editingForm.type === "questionnaire" && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  This is a built-in scored questionnaire. Only the title and description can be edited here.
                </p>
              )}
              {editError && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {editError}
                </p>
              )}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={saveEdit}
                disabled={editSaving}
                className="rounded-xl bg-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:opacity-60"
              >
                {editSaving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditingForm(null)}
                className="rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-cream-50 hover:text-gray-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 dark:hover:text-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-navy px-5 py-3 text-sm font-medium text-white shadow-lg dark:bg-neutral-700">
          {toast}
        </div>
      )}
    </main>
  );
}
