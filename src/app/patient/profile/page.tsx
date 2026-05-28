"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaliforniaAddressAutocomplete } from "@/components/CaliforniaAddressAutocomplete";

type PatientDocument = {
  id: string;
  displayName: string;
  fileName: string;
  contentType?: string;
  createdAt: string;
  downloadUrl?: string | null;
};

type ProfileData = {
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
  isComplete: boolean;
  lastUpdatedAt?: string | null;
  user: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    email?: string;
  };
};

const REQUIRED_PROFILE_FIELDS = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "sex", label: "Gender" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "ssn", label: "SSN" },
  { key: "preferredPharmacyName", label: "Preferred pharmacy" },
  { key: "preferredPharmacyAddress", label: "Preferred pharmacy address" },
  { key: "guardian1Name", label: "Parent 1 name" },
  { key: "guardian1Relationship", label: "Parent 1 relationship" },
  { key: "guardian1Phone", label: "Parent 1 phone" },
  { key: "guardian1Address", label: "Parent 1 address" },
] as const;

function formatSsn(digits: string): string {
  const d = (digits || "").replace(/\D/g, "").slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}


export default function PatientProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(null);
  const [showSsn, setShowSsn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [data, setData] = useState<ProfileData | null>(null);
  const [canBookOrientation, setCanBookOrientation] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    sex: "",
    dateOfBirth: "",
    ssn: "",
    address: "",
    preferredPharmacyName: "",
    preferredPharmacyPhone: "",
    preferredPharmacyAddress: "",
    guardian1Name: "",
    guardian1Relationship: "",
    guardian1Phone: "",
    guardian1Address: "",
    guardian2Name: "",
    guardian2Relationship: "",
    guardian2Phone: "",
    guardian2Address: "",
  });

  useEffect(() => {
    loadProfile();
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const res = await fetch("/api/patient-documents/", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setDocuments(d.documents ?? []);
      }
    } catch {
      // ignore
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    const files = fileInput?.files;
    if (!files?.length) return;
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
    const toUpload: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!allowed.includes(ext)) {
        setUploadError(`Invalid file type: ${file.name}. Allowed: PDF, PNG, JPG, GIF, WebP.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max file size is 10 MB.`);
        return;
      }
      toUpload.push(file);
    }
    setUploading(true);
    setError(null);
    const failed: string[] = [];
    try {
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const fd = new FormData();
        fd.append("file", file);
        fd.append("displayName", file.name);
        const res = await fetch("/api/patient-documents/upload", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          failed.push(`${file.name}: ${err.detail || "Upload failed"}`);
        }
      }
      if (failed.length > 0) {
        setError(failed.join("; "));
      } else {
        fileInput!.value = "";
        loadDocuments();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveDocument(documentId: string) {
    if (removingDocumentId) return;
    setRemovingDocumentId(documentId);
    setError(null);
    try {
      const res = await fetch(`/api/patient-documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to remove document");
      }
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove document");
    } finally {
      setRemovingDocumentId(null);
    }
  }

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/patient-profile/", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load profile");
      const d = await res.json();
      setData(d);
      setForm({
        firstName: d.user?.firstName ?? "",
        lastName: d.user?.lastName ?? "",
        phone: (d.user?.phone ?? "").replace(/\D/g, "").slice(-10),
        sex: d.profile?.sex ?? "",
        dateOfBirth: d.profile?.dateOfBirth ?? "",
        ssn: (d.profile?.ssn ?? "").replace(/\D/g, "").slice(0, 9),
        address: d.profile?.address ?? "",
        preferredPharmacyName: d.profile?.preferredPharmacyName ?? "",
        preferredPharmacyPhone: (d.profile?.preferredPharmacyPhone ?? "").replace(/\D/g, "").slice(-10),
        preferredPharmacyAddress: d.profile?.preferredPharmacyAddress ?? "",
        guardian1Name: d.profile?.guardian1Name ?? "",
        guardian1Relationship: d.profile?.guardian1Relationship ?? "",
        guardian1Phone: (d.profile?.guardian1Phone ?? "").replace(/\D/g, "").slice(-10),
        guardian1Address: d.profile?.guardian1Address ?? "",
        guardian2Name: d.profile?.guardian2Name ?? "",
        guardian2Relationship: d.profile?.guardian2Relationship ?? "",
        guardian2Phone: (d.profile?.guardian2Phone ?? "").replace(/\D/g, "").slice(-10),
        guardian2Address: d.profile?.guardian2Address ?? "",
      });

      // Use backend phase-gating rules so UI only suggests orientation when truly allowed.
      const allowedRes = await fetch("/api/appointments/allowed-types", { credentials: "include" });
      if (allowedRes.ok) {
        const allowedData = await allowedRes.json().catch(() => null);
        const allowedTypes = Array.isArray(allowedData?.allowedTypes) ? allowedData.allowedTypes : [];
        const orientationAllowed = allowedTypes.some((item: unknown) => {
          if (typeof item === "string") return item === "orientation_consult";
          if (item && typeof item === "object") {
            return (item as { type?: string }).type === "orientation_consult";
          }
          return false;
        });
        setCanBookOrientation(orientationAllowed);
      } else {
        setCanBookOrientation(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ssnDigits = (form.ssn ?? "").replace(/\D/g, "");
    const errors = new Set<string>();
    if (!form.firstName.trim()) errors.add("firstName");
    if (!form.lastName.trim()) errors.add("lastName");
    if ((form.phone ?? "").replace(/\D/g, "").length < 10) errors.add("phone");
    if (!form.address.trim()) errors.add("address");
    if (!form.sex.trim()) errors.add("sex");
    if (!form.dateOfBirth.trim()) errors.add("dateOfBirth");
    if (ssnDigits.length !== 9) errors.add("ssn");
    if (!form.preferredPharmacyName.trim()) errors.add("preferredPharmacyName");
    if (!form.preferredPharmacyAddress.trim()) errors.add("preferredPharmacyAddress");
    if (!form.guardian1Name.trim()) errors.add("guardian1Name");
    if (!form.guardian1Relationship.trim()) errors.add("guardian1Relationship");
    if ((form.guardian1Phone ?? "").replace(/\D/g, "").length < 10) errors.add("guardian1Phone");
    if (!form.guardian1Address.trim()) errors.add("guardian1Address");
    setFieldErrors(errors);
    if (errors.size > 0) {
      setError(`Please fill in all required fields (${errors.size} missing).`);
      const firstErrorEl = document.querySelector("[data-field-error]");
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/patient-profile/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          phone: form.phone.trim() ? `1${form.phone.trim()}` : undefined,
          sex: form.sex.trim() || undefined,
          dateOfBirth: form.dateOfBirth.trim() || undefined,
          ssn: (form.ssn ?? "").replace(/\D/g, "").slice(0, 9) || undefined,
          address: form.address.trim() || undefined,
          preferredPharmacyName: form.preferredPharmacyName.trim() || undefined,
          preferredPharmacyPhone: form.preferredPharmacyPhone.trim() || undefined,
          preferredPharmacyAddress: form.preferredPharmacyAddress.trim() || undefined,
          guardian1Name: form.guardian1Name.trim() || undefined,
          guardian1Relationship: form.guardian1Relationship.trim() || undefined,
          guardian1Phone: form.guardian1Phone.trim() ? `1${form.guardian1Phone.trim()}` : undefined,
          guardian1Address: form.guardian1Address.trim() || undefined,
          guardian2Name: form.guardian2Name.trim() || undefined,
          guardian2Relationship: form.guardian2Relationship.trim() || undefined,
          guardian2Phone: form.guardian2Phone.trim() ? `1${form.guardian2Phone.trim()}` : undefined,
          guardian2Address: form.guardian2Address.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save profile");
      }
      setSuccess(true);
      setFieldErrors(new Set());
      loadProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50/60">
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading profile…
          </div>
        </main>
      </div>
    );
  }

  const completedRequiredCount = REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = form[field.key];
    if (field.key === "ssn") return (value || "").replace(/\D/g, "").length === 9;
    if (field.key === "phone") return (value || "").replace(/\D/g, "").length >= 10;
    return Boolean((value || "").trim());
  }).length;
  const totalRequiredCount = REQUIRED_PROFILE_FIELDS.length;
  const remainingRequiredCount = totalRequiredCount - completedRequiredCount;
  const completionPercent = Math.round((completedRequiredCount / totalRequiredCount) * 100);
  const remainingLabel = remainingRequiredCount === 1 ? "field" : "fields";
  const lastUpdatedLabel = data?.lastUpdatedAt
    ? new Date(data.lastUpdatedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : null;

  const inputBase = "mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-navy shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1";
  const inputOk = "border-gray-200 focus:border-cta focus:ring-cta";
  const inputErr = "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-400";
  const inp = (field: string) => `${inputBase} ${fieldErrors.has(field) ? inputErr : inputOk}`;
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="min-h-screen bg-cream-50/60">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Back link */}
        <Link href="/patient" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cta transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to dashboard
        </Link>

        {/* Page header */}
        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy">Your profile</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {data?.isComplete
                ? "Your profile is complete. You can update your details below."
                : "Complete your profile to book your 30-minute orientation consultation."}
            </p>
          </div>
          {lastUpdatedLabel && (
            <p className="shrink-0 text-xs text-gray-400">Last updated: {lastUpdatedLabel}</p>
          )}
        </div>

        {/* Completion bar */}
        <div className="mt-6 overflow-hidden rounded-2xl border-2 border-gray-300 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold ${completionPercent === 100 ? "bg-green-100 text-green-700" : "bg-cta/10 text-cta"}`}>
                {completionPercent === 100 ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : `${completionPercent}%`}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">
                  {completionPercent === 100 ? "Profile complete" : `Profile ${completionPercent}% complete`}
                </p>
                {remainingRequiredCount > 0 && (
                  <p className="text-xs text-gray-500">{remainingRequiredCount} required {remainingLabel} remaining</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completionPercent === 100 ? "bg-green-500" : "bg-cta"}`}
              style={{ width: `${completionPercent}%` }}
              aria-hidden
            />
          </div>
        </div>

        {/* Incomplete fields notice */}
        {!data?.isComplete && (
          <div className="mt-4 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-900">Required information missing</p>
              <p className="mt-0.5 text-sm text-amber-800">
                Please fill in: Name, Contact info, Address, Gender, Date of Birth, SSN, Preferred Pharmacy, and Parent 1 details.
              </p>
              <p className="mt-1 text-xs text-amber-700">Once complete, you can book your orientation consultation.</p>
            </div>
          </div>
        )}

        {/* Error / success banners */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-800">Profile saved successfully.</p>
              {data?.isComplete && canBookOrientation && (
                <p className="mt-0.5 text-sm text-green-700">
                  You can now{" "}
                  <Link href="/patient/book" className="font-medium underline">book your orientation consultation →</Link>
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">

          {/* ── Patient name & contact ── */}
          <div className="rounded-2xl border-2 border-gray-300 bg-white shadow-sm">
            <div className="rounded-t-2xl border-b-2 border-gray-300 bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cta/10 text-cta">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
                  </svg>
                </span>
                <h2 className="font-semibold text-navy">Patient name &amp; contact</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>First name *</label>
                  <input type="text" value={form.firstName} onChange={(e) => { setForm((f) => ({ ...f, firstName: e.target.value })); setFieldErrors((s) => { const n = new Set(s); n.delete("firstName"); return n; }); }} required className={inp("firstName")} />
                  {fieldErrors.has("firstName") && <p className="mt-1 text-xs text-red-500">First name is required.</p>}
                </div>
                <div>
                  <label className={labelClass}>Last name *</label>
                  <input type="text" value={form.lastName} onChange={(e) => { setForm((f) => ({ ...f, lastName: e.target.value })); setFieldErrors((s) => { const n = new Set(s); n.delete("lastName"); return n; }); }} required className={inp("lastName")} />
                  {fieldErrors.has("lastName") && <p className="mt-1 text-xs text-red-500">Last name is required.</p>}
                </div>
              </div>
              <div className="mt-5">
                <label className={labelClass}>Phone *</label>
                <div className={`mt-1 flex overflow-hidden rounded-xl border bg-white shadow-sm focus-within:ring-1 ${fieldErrors.has("phone") ? "border-red-400 bg-red-50 focus-within:border-red-500 focus-within:ring-red-400" : "border-gray-200 focus-within:border-cta focus-within:ring-cta"}`}>
                  <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500">+1</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 10); setForm((f) => ({ ...f, phone: digits })); if (digits.length >= 10) setFieldErrors((s) => { const n = new Set(s); n.delete("phone"); return n; }); }}
                    required
                    placeholder="2175551234"
                    className="w-full border-0 bg-transparent px-3.5 py-2.5 text-sm text-navy placeholder:text-gray-400 focus:ring-0"
                  />
                </div>
                {fieldErrors.has("phone") && <p className="mt-1 text-xs text-red-500">Valid 10-digit phone is required.</p>}
              </div>
              <div className="mt-5">
                <label className={labelClass}>Address *</label>
                <CaliforniaAddressAutocomplete
                  id="profile-address"
                  value={form.address}
                  onChange={(address) => { setForm((f) => ({ ...f, address })); if (address.trim()) setFieldErrors((s) => { const n = new Set(s); n.delete("address"); return n; }); }}
                  placeholder="Start typing your California address…"
                  required
                  className={inp("address")}
                />
                {fieldErrors.has("address") && <p className="mt-1 text-xs text-red-500">Address is required.</p>}
              </div>
            </div>
          </div>

          {/* ── Demographics ── */}
          <div className="rounded-2xl border-2 border-gray-300 bg-white shadow-sm">
            <div className="rounded-t-2xl border-b-2 border-gray-300 bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
                  </svg>
                </span>
                <h2 className="font-semibold text-navy">Demographics</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Gender *</label>
                  <select value={form.sex} onChange={(e) => { setForm((f) => ({ ...f, sex: e.target.value })); if (e.target.value) setFieldErrors((s) => { const n = new Set(s); n.delete("sex"); return n; }); }} required className={inp("sex")}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                  {fieldErrors.has("sex") && <p className="mt-1 text-xs text-red-500">Gender is required.</p>}
                </div>
                <div>
                  <label className={labelClass}>Date of birth *</label>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => { setForm((f) => ({ ...f, dateOfBirth: e.target.value })); if (e.target.value) setFieldErrors((s) => { const n = new Set(s); n.delete("dateOfBirth"); return n; }); }} required className={inp("dateOfBirth")} />
                  {fieldErrors.has("dateOfBirth") && <p className="mt-1 text-xs text-red-500">Date of birth is required.</p>}
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5V7.875a4.5 4.5 0 119 0V10.5M6.75 10.5h10.5A1.5 1.5 0 0118.75 12v7.5a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V12a1.5 1.5 0 011.5-1.5z" />
                    </svg>
                    SSN (Social Security Number) *
                  </label>
                  <button type="button" onClick={() => setShowSsn((v) => !v)} className="text-xs font-medium text-cta hover:underline">
                    {showSsn ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showSsn ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  value={formatSsn(form.ssn)}
                  onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 9); setForm((f) => ({ ...f, ssn: digits })); }}
                  required
                  placeholder="•••-••-1234"
                  className={inp("ssn")}
                />
                {fieldErrors.has("ssn") && <p className="mt-1 text-xs text-red-500">Full 9-digit SSN is required.</p>}
                <p className="mt-1.5 text-xs text-gray-400">Used only for insurance &amp; identity verification.</p>
              </div>
            </div>
          </div>

          {/* ── Preferred pharmacy ── */}
          <div className="rounded-2xl border-2 border-gray-300 bg-white shadow-sm">
            <div className="rounded-t-2xl border-b-2 border-gray-300 bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                </span>
                <h2 className="font-semibold text-navy">Preferred pharmacy *</h2>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className={labelClass}>Pharmacy name *</label>
                <input type="text" value={form.preferredPharmacyName} onChange={(e) => { setForm((f) => ({ ...f, preferredPharmacyName: e.target.value })); if (e.target.value.trim()) setFieldErrors((s) => { const n = new Set(s); n.delete("preferredPharmacyName"); return n; }); }} required placeholder="e.g. CVS, Walgreens" className={inp("preferredPharmacyName")} />
                {fieldErrors.has("preferredPharmacyName") && <p className="mt-1 text-xs text-red-500">Pharmacy name is required.</p>}
              </div>
              <div>
                <label className={labelClass}>Pharmacy phone</label>
                <div className="mt-1 flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-cta focus-within:ring-1 focus-within:ring-cta">
                  <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500">+1</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.preferredPharmacyPhone}
                    onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 10); setForm((f) => ({ ...f, preferredPharmacyPhone: digits })); }}
                    placeholder="2175551234"
                    className="w-full border-0 bg-transparent px-3.5 py-2.5 text-sm text-navy placeholder:text-gray-400 focus:ring-0"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Pharmacy address *</label>
                <CaliforniaAddressAutocomplete
                  id="profile-pharmacy-address"
                  value={form.preferredPharmacyAddress}
                  onChange={(address) => { setForm((f) => ({ ...f, preferredPharmacyAddress: address })); if (address.trim()) setFieldErrors((s) => { const n = new Set(s); n.delete("preferredPharmacyAddress"); return n; }); }}
                  placeholder="Start typing pharmacy California address…"
                  required
                  className={inp("preferredPharmacyAddress")}
                />
                {fieldErrors.has("preferredPharmacyAddress") && <p className="mt-1 text-xs text-red-500">Pharmacy address is required.</p>}
              </div>
            </div>
          </div>

          {/* ── Parent / Guardian details ── */}
          <div className="rounded-2xl border-2 border-gray-300 bg-white shadow-sm">
            <div className="rounded-t-2xl border-b-2 border-gray-300 bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-semibold text-navy">Parent / Guardian details</h2>
                  <p className="text-xs text-gray-500">Parent 1 is required; Parent 2 is optional</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-cream-100 p-6 space-y-6">

              {/* Parent 1 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cta text-xs font-bold text-white">1</span>
                  <h3 className="text-sm font-semibold text-navy">Parent 1 *</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Name *</label>
                    <input type="text" value={form.guardian1Name} onChange={(e) => { setForm((f) => ({ ...f, guardian1Name: e.target.value })); if (e.target.value.trim()) setFieldErrors((s) => { const n = new Set(s); n.delete("guardian1Name"); return n; }); }} required className={inp("guardian1Name")} />
                    {fieldErrors.has("guardian1Name") && <p className="mt-1 text-xs text-red-500">Parent 1 name is required.</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Relationship *</label>
                    <input type="text" value={form.guardian1Relationship} onChange={(e) => { setForm((f) => ({ ...f, guardian1Relationship: e.target.value })); if (e.target.value.trim()) setFieldErrors((s) => { const n = new Set(s); n.delete("guardian1Relationship"); return n; }); }} placeholder="e.g. Mother, Father" required className={inp("guardian1Relationship")} />
                    {fieldErrors.has("guardian1Relationship") && <p className="mt-1 text-xs text-red-500">Relationship is required.</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Phone *</label>
                    <div className={`mt-1 flex overflow-hidden rounded-xl border bg-white shadow-sm focus-within:ring-1 ${fieldErrors.has("guardian1Phone") ? "border-red-400 bg-red-50 focus-within:border-red-500 focus-within:ring-red-400" : "border-gray-200 focus-within:border-cta focus-within:ring-cta"}`}>
                      <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500">+1</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.guardian1Phone}
                        onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 10); setForm((f) => ({ ...f, guardian1Phone: digits })); if (digits.length >= 10) setFieldErrors((s) => { const n = new Set(s); n.delete("guardian1Phone"); return n; }); }}
                        placeholder="2175551234"
                        required
                        className="w-full border-0 bg-transparent px-3.5 py-2.5 text-sm text-navy placeholder:text-gray-400 focus:ring-0"
                      />
                    </div>
                    {fieldErrors.has("guardian1Phone") && <p className="mt-1 text-xs text-red-500">Valid 10-digit phone is required.</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Address *</label>
                    <CaliforniaAddressAutocomplete id="profile-guardian1-address" value={form.guardian1Address} onChange={(address) => { setForm((f) => ({ ...f, guardian1Address: address })); if (address.trim()) setFieldErrors((s) => { const n = new Set(s); n.delete("guardian1Address"); return n; }); }} placeholder="Start typing address…" restrictToCalifornia={false} required className={inp("guardian1Address")} />
                    {fieldErrors.has("guardian1Address") && <p className="mt-1 text-xs text-red-500">Parent 1 address is required.</p>}
                  </div>
                </div>
              </div>

              {/* Parent 2 */}
              <div className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">2</span>
                  <h3 className="text-sm font-semibold text-navy">Parent 2 <span className="font-normal text-gray-400">(optional)</span></h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input type="text" value={form.guardian2Name} onChange={(e) => setForm((f) => ({ ...f, guardian2Name: e.target.value }))} className={inp("_optional")} />
                  </div>
                  <div>
                    <label className={labelClass}>Relationship</label>
                    <input type="text" value={form.guardian2Relationship} onChange={(e) => setForm((f) => ({ ...f, guardian2Relationship: e.target.value }))} placeholder="e.g. Mother, Father" className={inp("_optional")} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <div className="mt-1 flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-cta focus-within:ring-1 focus-within:ring-cta">
                      <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500">+1</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.guardian2Phone}
                        onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 10); setForm((f) => ({ ...f, guardian2Phone: digits })); }}
                        placeholder="2175551234"
                        className="w-full border-0 bg-transparent px-3.5 py-2.5 text-sm text-navy placeholder:text-gray-400 focus:ring-0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Address</label>
                    <CaliforniaAddressAutocomplete id="profile-guardian2-address" value={form.guardian2Address} onChange={(address) => setForm((f) => ({ ...f, guardian2Address: address }))} placeholder="Start typing address…" restrictToCalifornia={false} className={inp("_optional")} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save bar */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-cta px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cta/90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : "Save profile"}
            </button>
            <Link href="/patient" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
              Cancel
            </Link>
          </div>
        </form>

        {/* ── Medical records ── */}
        <div className="mt-6 rounded-2xl border-2 border-gray-300 bg-white shadow-sm">
          <div className="rounded-t-2xl border-b-2 border-gray-300 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-8.625a1.125 1.125 0 00-1.125-1.125H8.25m11.25 9.75l-3-3m3 3l-3 3m-2.25-12h-6A1.125 1.125 0 007.125 6.375v11.25A1.125 1.125 0 008.25 18.75h8.625A1.125 1.125 0 0018 17.625V9.75a1.125 1.125 0 00-.33-.795l-3.375-3.375A1.125 1.125 0 0013.5 5.25z" />
                </svg>
              </span>
              <div>
                <h2 className="font-semibold text-navy">Previous medical records</h2>
                <p className="text-xs text-gray-500">PDF, PNG, JPG — max 10 MB per file</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Select files</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                  multiple
                  onChange={() => setUploadError(null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-cta/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-cta hover:file:bg-cta/20"
                />
              </div>
              <button type="submit" disabled={uploading} className="rounded-xl bg-cta px-4 py-2.5 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50">
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </form>
            {uploadError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                {uploadError}
              </div>
            )}
            {documents.length > 0 && (
              <ul className="mt-5 space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-8.625a1.125 1.125 0 00-1.125-1.125H8.25m11.25 9.75l-3-3m3 3l-3 3m-2.25-12h-6A1.125 1.125 0 007.125 6.375v11.25A1.125 1.125 0 008.25 18.75h8.625A1.125 1.125 0 0018 17.625V9.75a1.125 1.125 0 00-.33-.795l-3.375-3.375A1.125 1.125 0 0013.5 5.25z" />
                      </svg>
                      <span className="text-sm font-medium text-navy">{doc.fileName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {doc.downloadUrl && (
                        <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cta hover:underline">View</a>
                      )}
                      <button type="button" onClick={() => handleRemoveDocument(doc.id)} disabled={removingDocumentId === doc.id} className="text-sm font-medium text-red-500 hover:underline disabled:opacity-50">
                        {removingDocumentId === doc.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
