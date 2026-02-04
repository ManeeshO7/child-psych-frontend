"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function ConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!requestId || !requestId.trim()) {
      router.replace("/request-access");
    }
  }, [requestId, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!requestId?.trim()) return;
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Privacy & Use of Information Notice</h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-wider text-warm-brown">
            Consent to Review
          </p>

          <div className="card mt-10 space-y-6">
            <section className="space-y-4 text-warm-brown">
              <h2 className="text-lg font-semibold text-warm-brown">Privacy & Use of Information Notice</h2>
              <p>
                This questionnaire is used to determine clinical fit for our practice. Information you submit is{" "}
                <strong>protected health information (PHI)</strong> and is handled in accordance with federal and
                state privacy laws, including HIPAA.
              </p>
              <p>
                Submission of this questionnaire <strong>does not establish a physician–patient relationship</strong>.
                A clinical relationship is established only after you are accepted and have completed the required
                consent documents.
              </p>
              <p>
                This practice <strong>does not provide emergency, crisis, or after-hours urgent care services</strong>.
                If you or your child are experiencing a psychiatric emergency, please call 911.
              </p>
            </section>

            <section className="space-y-3 border-t border-cream-200 pt-6">
              <h2 className="text-lg font-semibold text-warm-brown">Consent to Review</h2>
              <p className="text-warm-brown">
                By submitting this questionnaire, I confirm that I am the child&apos;s legal guardian authorized to
                provide health information and consent to its review for care determination purposes.
              </p>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                />
                <span className="text-sm font-medium text-warm-brown">I agree</span>
              </label>
            </section>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
              <button
                type="submit"
                disabled={!agreed || status === "submitting"}
                className="btn-primary w-full"
              >
                {status === "submitting" ? "Continuing…" : "Continue"}
              </button>
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
            <p className="text-warm-brown">Loading…</p>
          </div>
        </main>
        <Footer />
      </>
    }>
      <ConsentContent />
    </Suspense>
  );
}
