"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type IntakeFormData = {
  reasonForVisit?: string;
  currentMedications?: string;
  psychiatricHistory?: string;
  medicalConditions?: string;
  allergies?: string;
  emergencyContact?: string;
  preferredContactMethod?: string;
  additionalNotes?: string;
};

type IntakeStatus = "draft" | "submitted" | "reviewed" | null;

export default function IntakeForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<IntakeFormData>({});
  const [status, setStatus] = useState<IntakeStatus>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch("/api/intake", { credentials: "include" });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 200) {
      const data = await res.json();
      if (data) {
        setFormData(data.formData || {});
        setStatus(data.status);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveDraft() {
    setSaving(true);
    try {
      const res = await fetch("/api/intake", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to save");
        return;
      }
      setStatus("draft");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to submit");
        return;
      }
      setStatus("submitted");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-cream-200 bg-white p-8 shadow-sm">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (status === "submitted" || status === "reviewed") {
    return (
      <div className="rounded-xl border border-cream-200 bg-white p-8 shadow-sm">
        <p className="font-medium text-warm-brown">
          {status === "reviewed"
            ? "Your intake has been reviewed by your provider."
            : "Your intake form has been submitted. Your provider will review it and be in touch."}
        </p>
        <Link href="/patient" className="mt-4 inline-block text-sm text-warm-brown hover:underline">
          ← Back to Patient Portal
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Reason for visit</label>
          <textarea
            value={formData.reasonForVisit ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, reasonForVisit: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="What brings you in today?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Current medications</label>
          <textarea
            value={formData.currentMedications ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, currentMedications: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            rows={2}
            placeholder="List any current medications (including psychiatric and other)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Psychiatric / mental health history</label>
          <textarea
            value={formData.psychiatricHistory ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, psychiatricHistory: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="Previous diagnoses, treatments, hospitalizations, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Medical conditions</label>
          <textarea
            value={formData.medicalConditions ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, medicalConditions: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            rows={2}
            placeholder="Relevant medical history"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Allergies</label>
          <input
            type="text"
            value={formData.allergies ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, allergies: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            placeholder="Medication or other allergies"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Emergency contact</label>
          <input
            type="text"
            value={formData.emergencyContact ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, emergencyContact: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            placeholder="Name and phone"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Preferred contact method</label>
          <input
            type="text"
            value={formData.preferredContactMethod ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, preferredContactMethod: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            placeholder="e.g. Email, phone, portal message"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Additional notes</label>
          <textarea
            value={formData.additionalNotes ?? ""}
            onChange={(e) => setFormData((d) => ({ ...d, additionalNotes: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            rows={2}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          className="btn-secondary"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Submitting…" : "Submit intake"}
        </button>
        <Link href="/patient" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
