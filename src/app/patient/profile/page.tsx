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
  user: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    email?: string;
  };
};

export default function PatientProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<ProfileData | null>(null);
  const [cardSummary, setCardSummary] = useState<{
    hasCard: boolean;
    brand?: string | null;
    last4?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
  } | null>(null);
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
    loadCardSummary();
  }, []);

  async function loadCardSummary() {
    try {
      const res = await fetch("/api/payments/payment-method", { credentials: "include" });
      if (res.ok) {
        const card = await res.json().catch(() => null);
        setCardSummary(card && typeof card === "object" ? card : null);
      }
    } catch {
      // ignore
    }
  }

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
        setError(`Allowed: PDF, PNG, JPG, GIF, WebP. Invalid: ${file.name}`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`File too large (max 10 MB): ${file.name}`);
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
        ssn: d.profile?.ssn ?? "",
        address: d.profile?.address ?? "",
        preferredPharmacyName: d.profile?.preferredPharmacyName ?? "",
        preferredPharmacyPhone: (d.profile?.preferredPharmacyPhone ?? "").replace(/\D/g, "").slice(-10),
        preferredPharmacyAddress: d.profile?.preferredPharmacyAddress ?? "",
        guardian1Name: d.profile?.guardian1Name ?? "",
        guardian1Relationship: d.profile?.guardian1Relationship ?? "",
        guardian1Phone: d.profile?.guardian1Phone ?? "",
        guardian1Address: d.profile?.guardian1Address ?? "",
        guardian2Name: d.profile?.guardian2Name ?? "",
        guardian2Relationship: d.profile?.guardian2Relationship ?? "",
        guardian2Phone: (d.profile?.guardian2Phone ?? "").replace(/\D/g, "").slice(-10),
        guardian2Address: d.profile?.guardian2Address ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ssnDigits = (form.ssn ?? "").replace(/\D/g, "");
    if (ssnDigits.length !== 9) {
      setError("Please enter your full 9-digit Social Security Number.");
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
      loadProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading profile…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/patient" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>
      <h1 className="section-heading">Your profile</h1>
      <p className="mt-2 text-gray-600">
        Please complete your profile before booking your 30-minute orientation consultation. All fields marked with * are required.
      </p>

      {!data?.isComplete && (
        <div className="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Required: Name, Sex, Date of Birth, SSN, Contact info, and Preferred Pharmacy.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Once complete, you will be able to book your orientation consultation.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Profile saved successfully.</p>
          {data?.isComplete && (
            <p className="mt-1 text-sm text-green-700">
              You can now book your orientation consultation.{" "}
              <Link href="/patient/book" className="font-medium underline">
                Book appointment →
              </Link>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="rounded-xl border border-cream-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Name & contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">First name *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-warm-brown focus:ring-warm-brown"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last name *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-warm-brown focus:ring-warm-brown"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Phone *</label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:border-warm-brown focus-within:ring-1 focus-within:ring-warm-brown">
              <span className="flex items-center rounded-l-lg border-r border-gray-300 bg-gray-50 px-3 py-2 text-gray-600">+1</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm((f) => ({ ...f, phone: digits }));
                }}
                required
                placeholder="2175551234"
                className="w-full rounded-r-lg border-0 bg-transparent px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-0"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <CaliforniaAddressAutocomplete
              id="profile-address"
              value={form.address}
              onChange={(address) => setForm((f) => ({ ...f, address }))}
              placeholder="Start typing your California address…"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-warm-brown focus:ring-warm-brown"
            />
          </div>
        </div>

        <div className="rounded-xl border border-cream-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Demographics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Sex *</label>
              <select
                value={form.sex}
                onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-warm-brown focus:ring-warm-brown"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of birth *</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-warm-brown focus:ring-warm-brown"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">SSN (Social Security Number) *</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              value={form.ssn}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                setForm((f) => ({ ...f, ssn: digits }));
              }}
              required
              placeholder="XXX-XX-XXXX (full 9 digits required)"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-warm-brown focus:ring-warm-brown"
            />
            <p className="mt-1 text-xs text-gray-500">Your information is stored securely.</p>
          </div>
        </div>

        <div className="rounded-xl border border-cream-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Preferred pharmacy *</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pharmacy name *</label>
              <input
                type="text"
                value={form.preferredPharmacyName}
                onChange={(e) => setForm((f) => ({ ...f, preferredPharmacyName: e.target.value }))}
                required
                placeholder="e.g. CVS, Walgreens"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-warm-brown focus:ring-warm-brown"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pharmacy phone</label>
              <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:border-warm-brown focus-within:ring-1 focus-within:ring-warm-brown">
                <span className="flex items-center rounded-l-lg border-r border-gray-300 bg-gray-50 px-3 py-2 text-gray-600">+1</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.preferredPharmacyPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setForm((f) => ({ ...f, preferredPharmacyPhone: digits }));
                  }}
                  placeholder="2175551234"
                  className="w-full rounded-r-lg border-0 bg-transparent px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pharmacy address</label>
              <CaliforniaAddressAutocomplete
                id="profile-pharmacy-address"
                value={form.preferredPharmacyAddress}
                onChange={(address) => setForm((f) => ({ ...f, preferredPharmacyAddress: address }))}
                placeholder="Start typing pharmacy California address…"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-warm-brown focus:ring-warm-brown"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-cream-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Parent or guardian (optional)</h2>
          <p className="mt-1 text-sm text-gray-500">If applicable, provide up to 2 guardian contacts.</p>
          <div className="mt-4 space-y-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="text-sm font-medium text-gray-700">Guardian 1</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Name</label>
                  <input
                    type="text"
                    value={form.guardian1Name}
                    onChange={(e) => setForm((f) => ({ ...f, guardian1Name: e.target.value }))}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Relationship</label>
                  <input
                    type="text"
                    value={form.guardian1Relationship}
                    onChange={(e) => setForm((f) => ({ ...f, guardian1Relationship: e.target.value }))}
                    placeholder="e.g. Mother, Father"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600">Phone</label>
                  <div className="mt-1 flex rounded border border-gray-300 focus-within:border-warm-brown focus-within:ring-1 focus-within:ring-warm-brown">
                    <span className="flex items-center rounded-l border-r border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-600">+1</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.guardian1Phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm((f) => ({ ...f, guardian1Phone: digits }));
                      }}
                      placeholder="2175551234"
                      className="w-full rounded-r border-0 bg-transparent px-2 py-1.5 text-sm focus:ring-0"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600">Address</label>
                  <CaliforniaAddressAutocomplete
                    id="profile-guardian1-address"
                    value={form.guardian1Address}
                    onChange={(address) => setForm((f) => ({ ...f, guardian1Address: address }))}
                    placeholder="Start typing address…"
                    restrictToCalifornia={false}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="text-sm font-medium text-gray-700">Guardian 2</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Name</label>
                  <input
                    type="text"
                    value={form.guardian2Name}
                    onChange={(e) => setForm((f) => ({ ...f, guardian2Name: e.target.value }))}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Relationship</label>
                  <input
                    type="text"
                    value={form.guardian2Relationship}
                    onChange={(e) => setForm((f) => ({ ...f, guardian2Relationship: e.target.value }))}
                    placeholder="e.g. Mother, Father"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600">Phone</label>
                  <div className="mt-1 flex rounded border border-gray-300 focus-within:border-warm-brown focus-within:ring-1 focus-within:ring-warm-brown">
                    <span className="flex items-center rounded-l border-r border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-600">+1</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.guardian2Phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm((f) => ({ ...f, guardian2Phone: digits }));
                      }}
                      placeholder="2175551234"
                      className="w-full rounded-r border-0 bg-transparent px-2 py-1.5 text-sm focus:ring-0"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600">Address</label>
                  <CaliforniaAddressAutocomplete
                    id="profile-guardian2-address"
                    value={form.guardian2Address}
                    onChange={(address) => setForm((f) => ({ ...f, guardian2Address: address }))}
                    placeholder="Start typing address…"
                    restrictToCalifornia={false}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-warm-brown px-6 py-2.5 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
          <Link href="/patient" className="text-sm text-gray-600 hover:underline">
            Cancel
          </Link>
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-cream-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Card on file</h2>
        <p className="mt-1 text-sm text-gray-500">Payment method used for appointment charges.</p>
        {cardSummary?.hasCard ? (
          <p className="mt-2 text-sm text-gray-900">
            {(cardSummary.brand || "Card").toString().toUpperCase()} •••• {cardSummary.last4 || "—"}{" "}
            <span className="text-gray-600">(exp {cardSummary.expMonth ?? "—"}/{cardSummary.expYear ?? "—"})</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-600">No card on file</p>
        )}
        <Link href="/patient/save-card?returnTo=/patient/profile" className="mt-2 inline-block text-sm font-medium text-warm-brown hover:underline">
          {cardSummary?.hasCard ? "Update card →" : "Add card →"}
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-cream-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Previous medical records</h2>
        <p className="mt-1 text-sm text-gray-500">Upload documents (PDF, PNG, JPG) that your doctor may need. Max 10 MB per file.</p>
        <form onSubmit={handleUpload} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600">Files</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
              multiple
              className="mt-1 block w-full text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-warm-brown/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-warm-brown hover:file:bg-warm-brown/20"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
        {documents.length > 0 && (
          <ul className="mt-4 space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm">
                <span className="font-medium text-gray-900">{doc.fileName}</span>
                <div className="flex items-center gap-3">
                  {doc.downloadUrl && (
                    <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-warm-brown hover:underline">
                      View
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.id)}
                    disabled={removingDocumentId === doc.id}
                    className="text-red-700 hover:underline disabled:opacity-50"
                  >
                    {removingDocumentId === doc.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
