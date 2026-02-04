"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const AGE_OPTIONS = ["5-7", "8-12", "13-17", "18-21"] as const;
const PRIMARY_CONCERNS = [
  "ADHD / attention or executive functioning difficulties",
  "Anxiety or excessive worries",
  "Depression or mood concerns",
  "Emotional dysregulation or irritability",
  "Behavioral concerns",
  "Medication evaluation or management",
  "Second opinion",
] as const;

export type QuestionnaireFormData = {
  childAge?: string;
  childLocation?: string;
  legalGuardian?: "yes" | "no";
  primaryConcerns?: string[];
  otherConcern?: string;
  mainConcernsBrief?: string;
  suicideSelfHarm30Days?: "yes" | "no";
  suicideAttempts30Days?: "yes" | "no";
  harmOthers30Days?: "yes" | "no";
  recentHospitalization3Mo?: "yes" | "no";
  hospitalizationExplain?: string;
  currentlySeeingPsychiatrist?: "yes" | "no";
  currentlySeeingTherapist?: "yes" | "no";
  currentlyTakingMeds?: "yes" | "no";
  previousDiagnosis?: "yes" | "no";
  previousDiagnosisList?: string;
  reliableInternet?: "yes" | "no";
  privateSpace?: "yes" | "no";
  participateFromState?: "yes" | "no";
  comfortableTelehealth?: "yes" | "no";
  understandFeeForService?: "yes" | "no";
  understandNoGuarantee?: "yes" | "no";
  understandOtherCare?: "yes" | "no";
  additionalInfo?: string;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-warm-brown shadow-sm focus:border-warm-brown focus:outline-none focus:ring-1 focus:ring-warm-brown";
const labelClass = "block text-sm font-medium text-warm-brown";

function QuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [formData, setFormData] = useState<QuestionnaireFormData>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!requestId || !requestId.trim()) {
      router.replace("/request-access");
    }
  }, [requestId, router]);

  // Scroll to top when success so the thank-you message is visible (user was at bottom of form)
  useEffect(() => {
    if (status === "success") {
      window.scrollTo(0, 0);
    }
  }, [status]);

  function setConcerns(checked: boolean, value: string) {
    setFormData((prev) => {
      const arr = prev.primaryConcerns ?? [];
      if (checked) return { ...prev, primaryConcerns: [...arr, value] };
      return { ...prev, primaryConcerns: arr.filter((x) => x !== value) };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!requestId?.trim()) return;
    // Q4: at least one primary concern required
    const concerns = formData.primaryConcerns ?? [];
    if (concerns.length === 0) {
      setErrorMessage("Please select at least one primary concern (question 4).");
      setStatus("error");
      return;
    }
    // Q7: when "Yes" to recent hospitalization, explain is required
    if (formData.recentHospitalization3Mo === "yes") {
      const explain = (formData.hospitalizationExplain ?? "").trim();
      if (!explain) {
        setErrorMessage("Please briefly explain (question 7) when you select Yes to recent hospitalization/ER/crisis.");
        setStatus("error");
        return;
      }
    }
    // Q10: when "Yes" to previous diagnosis, list is required
    if (formData.previousDiagnosis === "yes") {
      const list = (formData.previousDiagnosisList ?? "").trim();
      if (!list) {
        setErrorMessage("Please list previous diagnoses (question 10) when you select Yes.");
        setStatus("error");
        return;
      }
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/request-access/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.trim(), formData }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.detail || json.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (!requestId?.trim()) {
    return null;
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col justify-center bg-cream-50 py-16">
          <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="card border-green-200 bg-green-50">
              <p className="font-medium text-green-800">Thank you — we received your request.</p>
              <p className="mt-2 text-sm text-green-700">
                We will let you know about the decision in 1–2 working days.
              </p>
              <Link href="/" className="mt-6 inline-block btn-primary">
                Back to Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Pre-Screening Questionnaire</h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-wider text-warm-brown">
            Please complete all sections
          </p>

          <p className="mt-1 text-xs text-warm-brown">
            Required fields are marked with <span className="text-red-500" aria-hidden="true">*</span>.
          </p>
          <form onSubmit={handleSubmit} className="mt-10 space-y-10">
            {/* A. Child & Family Information */}
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-warm-brown">A. Child & Family Information</h2>
              <div>
                <p className={labelClass}>
                  1. Child/patient age:
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {AGE_OPTIONS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="childAge"
                        value={opt}
                        checked={formData.childAge === opt}
                        onChange={() => setFormData((d) => ({ ...d, childAge: opt }))}
                        className="h-4 w-4 border-cream-300 text-warm-brown focus:ring-warm-brown"
                        required={opt === AGE_OPTIONS[0]}
                      />
                      <span className="text-sm text-warm-brown">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="childLocation" className={labelClass}>
                  2. Child&apos;s current location (state/country where visits will occur)
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </label>
                <input
                  id="childLocation"
                  type="text"
                  value={formData.childLocation ?? ""}
                  onChange={(e) => setFormData((d) => ({ ...d, childLocation: e.target.value }))}
                  className={inputClass}
                  required
                />
                <p className="mt-1 text-xs italic text-warm-brown">
                  Note: patient must be present in California at the time of visits.
                </p>
              </div>
              <div>
                <p className={labelClass}>
                  3. Are you the child&apos;s legal guardian authorized to consent to psychiatric care?
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="legalGuardian"
                      value="yes"
                      checked={formData.legalGuardian === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, legalGuardian: "yes" }))}
                      className="h-4 w-4 border-cream-300 text-warm-brown focus:ring-warm-brown"
                      required
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="legalGuardian"
                      value="no"
                      checked={formData.legalGuardian === "no"}
                      onChange={() => setFormData((d) => ({ ...d, legalGuardian: "no" }))}
                      className="h-4 w-4 border-cream-300 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
              </div>
            </div>

            {/* B. Reason for Seeking Services */}
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-warm-brown">B. Reason for Seeking Services</h2>
              <div>
                <p className={labelClass}>
                  4. What are the primary concerns you are seeking help for? (Select all that apply)
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 space-y-2">
                  {PRIMARY_CONCERNS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(formData.primaryConcerns ?? []).includes(opt)}
                        onChange={(e) => setConcerns(e.target.checked, opt)}
                        className="h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">{opt}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(formData.primaryConcerns ?? []).some((c) => c.startsWith("Other"))}
                      onChange={(e) => {
                        if (e.target.checked) setFormData((d) => ({ ...d, primaryConcerns: [...(d.primaryConcerns ?? []), "Other"] }));
                        else setFormData((d) => ({ ...d, primaryConcerns: (d.primaryConcerns ?? []).filter((c) => c !== "Other") }));
                      }}
                      className="h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">Other:</span>
                    <input
                      type="text"
                      value={formData.otherConcern ?? ""}
                      onChange={(e) => setFormData((d) => ({ ...d, otherConcern: e.target.value }))}
                      className="ml-1 flex-1 rounded border border-cream-200 px-2 py-1 text-sm text-warm-brown"
                      placeholder="Please specify"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="mainConcernsBrief" className={labelClass}>
                  5. Briefly describe your main concerns (1–2 sentences):
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </label>
                <textarea
                  id="mainConcernsBrief"
                  value={formData.mainConcernsBrief ?? ""}
                  onChange={(e) => setFormData((d) => ({ ...d, mainConcernsBrief: e.target.value }))}
                  className={inputClass}
                  rows={3}
                  required
                />
              </div>
            </div>

            {/* C. Safety & Acuity Screening */}
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-warm-brown">C. Safety & Acuity Screening</h2>
              <div>
                <p className={labelClass}>
                  6. In the past 30 days, has your child had:
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm text-warm-brown">Thoughts of suicide or self-harm?</span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="suicideSelfHarm30Days"
                          value="yes"
                          checked={formData.suicideSelfHarm30Days === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, suicideSelfHarm30Days: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="suicideSelfHarm30Days"
                          value="no"
                          checked={formData.suicideSelfHarm30Days === "no"}
                          onChange={() => setFormData((d) => ({ ...d, suicideSelfHarm30Days: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm text-warm-brown">Suicide attempts or self-injurious behavior?</span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="suicideAttempts30Days"
                          value="yes"
                          checked={formData.suicideAttempts30Days === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, suicideAttempts30Days: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="suicideAttempts30Days"
                          value="no"
                          checked={formData.suicideAttempts30Days === "no"}
                          onChange={() => setFormData((d) => ({ ...d, suicideAttempts30Days: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm text-warm-brown">Thoughts of harming others?</span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="harmOthers30Days"
                          value="yes"
                          checked={formData.harmOthers30Days === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, harmOthers30Days: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="harmOthers30Days"
                          value="no"
                          checked={formData.harmOthers30Days === "no"}
                          onChange={() => setFormData((d) => ({ ...d, harmOthers30Days: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className={labelClass}>7. Has your child had recent psychiatric hospitalization, emergency room visits, or crisis interventions in the past 3 months?</p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="recentHospitalization3Mo"
                      value="yes"
                      checked={formData.recentHospitalization3Mo === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, recentHospitalization3Mo: "yes" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="recentHospitalization3Mo"
                      value="no"
                      checked={formData.recentHospitalization3Mo === "no"}
                      onChange={() => setFormData((d) => ({ ...d, recentHospitalization3Mo: "no" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
                <p className="mt-2 text-sm text-warm-brown">
                  If &quot;Yes&quot; to any of the above, please briefly explain:
                  {formData.recentHospitalization3Mo === "yes" && (
                    <span className="text-red-500" aria-hidden="true"> *</span>
                  )}
                </p>
                <textarea
                  value={formData.hospitalizationExplain ?? ""}
                  onChange={(e) => setFormData((d) => ({ ...d, hospitalizationExplain: e.target.value }))}
                  className={inputClass}
                  rows={2}
                  placeholder={formData.recentHospitalization3Mo === "yes" ? "Required when Yes is selected" : "Optional"}
                  aria-required={formData.recentHospitalization3Mo === "yes"}
                />
                <p className="mt-1 text-xs italic text-warm-brown">
                  (Recommended note to families: This practice does not provide emergency or crisis care.)
                </p>
              </div>
            </div>

            {/* D. Current & Past Treatment */}
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-warm-brown">D. Current & Past Treatment</h2>
              <div>
                <p className={labelClass}>
                  8. Is your child currently seeing:
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-warm-brown">A psychiatrist?</span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlySeeingPsychiatrist"
                          value="yes"
                          checked={formData.currentlySeeingPsychiatrist === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, currentlySeeingPsychiatrist: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlySeeingPsychiatrist"
                          value="no"
                          checked={formData.currentlySeeingPsychiatrist === "no"}
                          onChange={() => setFormData((d) => ({ ...d, currentlySeeingPsychiatrist: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-warm-brown">A therapist/counselor?</span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlySeeingTherapist"
                          value="yes"
                          checked={formData.currentlySeeingTherapist === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, currentlySeeingTherapist: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlySeeingTherapist"
                          value="no"
                          checked={formData.currentlySeeingTherapist === "no"}
                          onChange={() => setFormData((d) => ({ ...d, currentlySeeingTherapist: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className={labelClass}>
                  9. Is your child currently taking psychiatric medication?
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="currentlyTakingMeds"
                      value="yes"
                      checked={formData.currentlyTakingMeds === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, currentlyTakingMeds: "yes" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      required
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="currentlyTakingMeds"
                      value="no"
                      checked={formData.currentlyTakingMeds === "no"}
                      onChange={() => setFormData((d) => ({ ...d, currentlyTakingMeds: "no" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
              </div>
              <div>
                <p className={labelClass}>10. Has your child previously been diagnosed with any psychiatric or neurodevelopmental conditions?</p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="previousDiagnosis"
                      value="yes"
                      checked={formData.previousDiagnosis === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, previousDiagnosis: "yes" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="previousDiagnosis"
                      value="no"
                      checked={formData.previousDiagnosis === "no"}
                      onChange={() => setFormData((d) => ({ ...d, previousDiagnosis: "no" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
                <p className="mt-2 text-sm text-warm-brown">
                  If yes, please list:
                  {formData.previousDiagnosis === "yes" && (
                    <span className="text-red-500" aria-hidden="true"> *</span>
                  )}
                </p>
                <input
                  type="text"
                  value={formData.previousDiagnosisList ?? ""}
                  onChange={(e) => setFormData((d) => ({ ...d, previousDiagnosisList: e.target.value }))}
                  className={inputClass}
                  placeholder={formData.previousDiagnosis === "yes" ? "Required when Yes is selected" : "Optional"}
                  aria-required={formData.previousDiagnosis === "yes"}
                />
              </div>
            </div>

            {/* E. Telehealth & Practical */}
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-warm-brown">E. Telehealth & Practical Requirements</h2>
              <div>
                <p className={labelClass}>
                  11. Do you have:
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-warm-brown">Reliable internet access for video visits?</span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="reliableInternet"
                          value="yes"
                          checked={formData.reliableInternet === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, reliableInternet: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="reliableInternet"
                          value="no"
                          checked={formData.reliableInternet === "no"}
                          onChange={() => setFormData((d) => ({ ...d, reliableInternet: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-warm-brown">A private space for sessions?</span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="privateSpace"
                          value="yes"
                          checked={formData.privateSpace === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, privateSpace: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="privateSpace"
                          value="no"
                          checked={formData.privateSpace === "no"}
                          onChange={() => setFormData((d) => ({ ...d, privateSpace: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className={labelClass}>
                  12. Are you able to participate in telehealth sessions from the state listed above?
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="participateFromState"
                      value="yes"
                      checked={formData.participateFromState === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, participateFromState: "yes" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      required
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="participateFromState"
                      value="no"
                      checked={formData.participateFromState === "no"}
                      onChange={() => setFormData((d) => ({ ...d, participateFromState: "no" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
              </div>
              <div>
                <p className={labelClass}>
                  13. Are you comfortable with care delivered exclusively via telehealth?
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="comfortableTelehealth"
                      value="yes"
                      checked={formData.comfortableTelehealth === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, comfortableTelehealth: "yes" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      required
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="comfortableTelehealth"
                      value="no"
                      checked={formData.comfortableTelehealth === "no"}
                      onChange={() => setFormData((d) => ({ ...d, comfortableTelehealth: "no" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
              </div>
            </div>

            {/* F. Practice Policies & Financial */}
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-warm-brown">F. Practice Policies & Financial Acknowledgment</h2>
              <div>
                <p className={labelClass}>
                  14. I understand that this is a fee-for-service practice and does not accept insurance.
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="understandFeeForService"
                      value="yes"
                      checked={formData.understandFeeForService === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, understandFeeForService: "yes" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      required
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="understandFeeForService"
                      value="no"
                      checked={formData.understandFeeForService === "no"}
                      onChange={() => setFormData((d) => ({ ...d, understandFeeForService: "no" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
              </div>
              <div>
                <p className={labelClass}>
                  15. I understand that completion of this form does not guarantee acceptance into the practice.
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="understandNoGuarantee"
                      value="yes"
                      checked={formData.understandNoGuarantee === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, understandNoGuarantee: "yes" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      required
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="understandNoGuarantee"
                      value="no"
                      checked={formData.understandNoGuarantee === "no"}
                      onChange={() => setFormData((d) => ({ ...d, understandNoGuarantee: "no" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
              </div>
              <div>
                <p className={labelClass}>
                  16. I understand that this practice may determine that another level or type of care is more appropriate.
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="understandOtherCare"
                      value="yes"
                      checked={formData.understandOtherCare === "yes"}
                      onChange={() => setFormData((d) => ({ ...d, understandOtherCare: "yes" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      required
                    />
                    <span className="text-sm text-warm-brown">Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="understandOtherCare"
                      value="no"
                      checked={formData.understandOtherCare === "no"}
                      onChange={() => setFormData((d) => ({ ...d, understandOtherCare: "no" }))}
                      className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">No</span>
                  </label>
                </div>
              </div>
            </div>

            {/* G. Additional (optional) */}
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-warm-brown">G. Additional Information (Optional)</h2>
              <div>
                <label htmlFor="additionalInfo" className={labelClass}>
                  17. Is there anything else you believe is important for us to know when determining fit?
                </label>
                <textarea
                  id="additionalInfo"
                  value={formData.additionalInfo ?? ""}
                  onChange={(e) => setFormData((d) => ({ ...d, additionalInfo: e.target.value }))}
                  className={inputClass}
                  rows={4}
                />
              </div>
            </div>

            {/* Gate check and submit */}
            <div className="card space-y-4">
              <p className="text-sm text-warm-brown">
                Please note: Submission of a contact request does not guarantee acceptance into the practice. All
                requests are reviewed carefully to ensure clinical appropriateness and alignment with the scope of
                services offered.
              </p>
              {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-primary w-full"
              >
                {status === "submitting" ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function QuestionnairePage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="min-h-screen bg-cream-50 py-16">
            <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
              <p className="text-warm-brown">Loading…</p>
            </div>
          </main>
          <Footer />
        </>
      }
    >
      <QuestionnaireContent />
    </Suspense>
  );
}
