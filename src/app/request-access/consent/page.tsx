"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function ConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [acks, setAcks] = useState({
    noEmergency: false,
    notInCrisis: false,
    adultNotInCrisis: false,
    privatePay: false,
    telePsychOnly: false,
    noGuarantee: false,
    noRelationship: false,
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const allAcked =
    acks.noEmergency &&
    acks.notInCrisis &&
    acks.adultNotInCrisis &&
    acks.privatePay &&
    acks.telePsychOnly &&
    acks.noGuarantee &&
    acks.noRelationship;

  useEffect(() => {
    if (!requestId || !requestId.trim()) {
      router.replace("/request-access");
    }
  }, [requestId, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!requestId?.trim()) return;
    
    // Validate that user has acknowledged all required items
    if (!allAcked) {
      setErrorMessage("Please check all required acknowledgements to continue.");
      return;
    }
    
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/request-access/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.detail || json.error || "Invalid or expired request. Please start over.");
        setStatus("error");
        return;
      }
      router.push(`/request-access/questionnaire?requestId=${encodeURIComponent(requestId)}`);
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (!requestId?.trim()) {
    return null;
  }

  const checkedCount = [
    acks.noEmergency,
    acks.notInCrisis,
    acks.adultNotInCrisis,
    acks.privatePay,
    acks.telePsychOnly,
    acks.noGuarantee,
    acks.noRelationship,
  ].filter(Boolean).length;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-12 sm:py-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-lg sm:text-xl font-semibold uppercase tracking-[0.15em] text-cta/90">
              Consent to review
            </p>
            <h1 className="mt-2 section-heading text-red-600">
              Required Acknowledgements
            </h1>
            <p className="mt-3 text-sm text-gray-600 max-w-md mx-auto">
              Please read and confirm each statement.
            </p>
          </div>

          <div className="card mt-8 sm:mt-10 p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                {checkedCount} of 7 selected
              </span>
              {allAcked && (
                <span className="text-sm font-medium text-green-700">Ready to continue</span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-1">
              <div className="space-y-0 divide-y divide-gray-100">
                <label className="flex cursor-pointer items-start gap-4 py-4 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={acks.noEmergency}
                    onChange={(e) => {
                      setAcks((p) => ({ ...p, noEmergency: e.target.checked }));
                      if (e.target.checked) setErrorMessage("");
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-cta focus:ring-cta focus:ring-offset-0"
                  />
                  <span className="text-[15px] text-navy leading-snug">
                    <span className="text-red-600">*</span> I understand this practice does not provide emergency or crisis care
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-4 py-4 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={acks.adultNotInCrisis}
                    onChange={(e) => {
                      setAcks((p) => ({ ...p, adultNotInCrisis: e.target.checked }));
                      if (e.target.checked) setErrorMessage("");
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-cta focus:ring-cta focus:ring-offset-0"
                  />
                  <span className="text-[15px] text-navy leading-snug">
                    <span className="text-red-600">*</span> I am not in psychiatric crisis
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-4 py-4 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={acks.notInCrisis}
                    onChange={(e) => {
                      setAcks((p) => ({ ...p, notInCrisis: e.target.checked }));
                      if (e.target.checked) setErrorMessage("");
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-cta focus:ring-cta focus:ring-offset-0"
                  />
                  <span className="text-[15px] text-navy leading-snug">
                    <span className="text-red-600">*</span> My child is not currently in psychiatric crisis
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-4 py-4 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={acks.privatePay}
                    onChange={(e) => {
                      setAcks((p) => ({ ...p, privatePay: e.target.checked }));
                      if (e.target.checked) setErrorMessage("");
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-cta focus:ring-cta focus:ring-offset-0"
                  />
                  <span className="text-[15px] text-navy leading-snug">
                    <span className="text-red-600">*</span> I understand this is a private, fee-for-service practice and does not bill insurance
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-4 py-4 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={acks.telePsychOnly}
                    onChange={(e) => {
                      setAcks((p) => ({ ...p, telePsychOnly: e.target.checked }));
                      if (e.target.checked) setErrorMessage("");
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-cta focus:ring-cta focus:ring-offset-0"
                  />
                  <span className="text-[15px] text-navy leading-snug">
                    <span className="text-red-600">*</span> I understand that this is strictly a tele psychiatric practice
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-4 py-4 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={acks.noGuarantee}
                    onChange={(e) => {
                      setAcks((p) => ({ ...p, noGuarantee: e.target.checked }));
                      if (e.target.checked) setErrorMessage("");
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-cta focus:ring-cta focus:ring-offset-0"
                  />
                  <span className="text-[15px] text-navy leading-snug">
                    <span className="text-red-600">*</span> I understand that submitting this form does not guarantee acceptance
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-4 py-4 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/50 -mx-2 px-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={acks.noRelationship}
                    onChange={(e) => {
                      setAcks((p) => ({ ...p, noRelationship: e.target.checked }));
                      if (e.target.checked) setErrorMessage("");
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-cta focus:ring-cta focus:ring-offset-0"
                  />
                  <span className="text-[15px] text-navy leading-snug">
                    <span className="text-red-600">*</span> I understand that no doctor-patient relationship is created by submitting this form
                  </span>
                </label>
              </div>

              {errorMessage && !allAcked && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {errorMessage}
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={!allAcked || status === "submitting"}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed py-4 text-base"
                  title={!allAcked ? "Please check all required acknowledgements to continue" : ""}
                >
                  {status === "submitting" ? "Continuing…" : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <main className="min-h-screen bg-cream-50 py-16">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <p className="text-cta">Loading…</p>
          </div>
        </main>
        <Footer />
      </>
    }>
      <ConsentContent />
    </Suspense>
  );
}
