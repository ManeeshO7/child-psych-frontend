"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CaliforniaAddressAutocomplete } from "@/components/CaliforniaAddressAutocomplete";

const AGE_OPTIONS = ["5-8", "9-12", "13-17", "18-25"] as const;
const PRIMARY_REASONS = [
  "Anxiety / stress",
  "Mood concerns",
  "ADHD / executive functioning",
  "Emotional regulation difficulties",
  "Medication review / second opinion",
] as const;

export type QuestionnaireFormData = {
  // ELIGIBILITY
  childAge?: string;
  /** Full address from Google Places (California only). Address where patient physically resides. */
  childResidenceAddress?: string;
  primaryReasons?: string[];
  primaryReasonOther?: string;
  
  // NON-ACUTE SAFETY SCREEN (past 60 days)
  activeSuicidalThoughts?: "yes" | "no";
  psychiatricHospitalization?: "yes" | "no";
  psychoticSymptoms?: "yes" | "no";
  severeAggression?: "yes" | "no";
  
  // Additional Questions
  legalCustodyCourt?: "yes" | "no";
  childProtectiveServices?: "yes" | "no";
  substanceUseConcerns?: "yes" | "no";
  currentlyReceivingCarePsychiatrist?: "yes" | "no";
  currentlyReceivingCareTherapist?: "yes" | "no";
  
  // Are you seeking
  seekingOngoingCare?: boolean;
  seekingConsultation?: boolean;
  
  // FINANCIAL & MODEL CONFIRMATION
  understandNonUrgentCare?: boolean;
  comfortableConciergeFee?: boolean;
  understandStructuredCommunication?: boolean;
  
  // Optional prompt
  whatPromptedReachOut?: string;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-cta shadow-sm focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta";
const labelClass = "block text-sm font-medium text-cta";

function QuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [formData, setFormData] = useState<QuestionnaireFormData>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error" | "rejected">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!requestId || !requestId.trim()) {
      router.replace("/request-access");
    }
  }, [requestId, router]);

  // Scroll to top when success/rejection so the message is visible
  useEffect(() => {
    if (status === "success" || status === "rejected") {
      window.scrollTo(0, 0);
    }
  }, [status]);

  function setPrimaryReasons(checked: boolean, value: string) {
    setFormData((prev) => {
      const arr = prev.primaryReasons ?? [];
      if (checked) {
        return { ...prev, primaryReasons: [...arr, value] };
      }
      return { ...prev, primaryReasons: arr.filter((x) => x !== value) };
    });
  }

  function checkRejectionConditions(): string | null {
    // Check NON-ACUTE SAFETY SCREEN (past 60 days)
    if (formData.activeSuicidalThoughts === "yes") {
      return "A 'Yes' response to active suicidal thoughts or self-harm behaviors may place care needs outside the scope of this practice.";
    }
    if (formData.psychiatricHospitalization === "yes") {
      return "A 'Yes' response to psychiatric hospitalization or emergency room visit may place care needs outside the scope of this practice.";
    }
    if (formData.psychoticSymptoms === "yes") {
      return "A 'Yes' response to psychotic symptoms may place care needs outside the scope of this practice.";
    }
    if (formData.severeAggression === "yes") {
      return "A 'Yes' response to severe aggression toward others may place care needs outside the scope of this practice.";
    }
    
    // Check Additional Questions
    if (formData.legalCustodyCourt === "yes") {
      return "Ongoing legal, custody, or court involvement may place care needs outside the scope of this practice.";
    }
    if (formData.childProtectiveServices === "yes") {
      return "Active child protective services involvement may place care needs outside the scope of this practice.";
    }
    
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!requestId?.trim()) return;
    
    // Validate required fields
    if (!formData.childAge) {
      setErrorMessage("Please select child's age.");
      setStatus("error");
      return;
    }
    const address = (formData.childResidenceAddress ?? "").trim();
    if (!address) {
      setErrorMessage("Please enter the child's California address (use the autocomplete to select a valid address).");
      setStatus("error");
      return;
    }
    const reasons = formData.primaryReasons ?? [];
    if (reasons.length === 0) {
      setErrorMessage("Please select at least one primary reason for seeking care.");
      setStatus("error");
      return;
    }
    if (reasons.includes("Other") && !formData.primaryReasonOther?.trim()) {
      setErrorMessage("Please specify the 'Other' primary reason.");
      setStatus("error");
      return;
    }
    
    // Check all safety screen questions are answered
    if (!formData.activeSuicidalThoughts || !formData.psychiatricHospitalization || 
        !formData.psychoticSymptoms || !formData.severeAggression) {
      setErrorMessage("Please answer all safety screen questions.");
      setStatus("error");
      return;
    }
    
    // Check all additional questions are answered
    if (formData.legalCustodyCourt === undefined || formData.childProtectiveServices === undefined ||
        formData.substanceUseConcerns === undefined || formData.currentlyReceivingCarePsychiatrist === undefined ||
        formData.currentlyReceivingCareTherapist === undefined) {
      setErrorMessage("Please answer all additional questions.");
      setStatus("error");
      return;
    }
    
    // Check seeking type
    if (!formData.seekingOngoingCare && !formData.seekingConsultation) {
      setErrorMessage("Please select at least one option for 'Are you seeking'.");
      setStatus("error");
      return;
    }
    
    // Check financial confirmations
    if (!formData.understandNonUrgentCare || !formData.comfortableConciergeFee || 
        !formData.understandStructuredCommunication) {
      setErrorMessage("Please check all financial & model confirmation statements.");
      setStatus("error");
      return;
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
      if (json.autoRejected) {
        setRejectionReason(
          "Based on your pre-screening questionnaire responses, our practice may not be the most appropriate setting for your child's current needs. If you have questions or concerns, please contact us directly."
        );
        setStatus("rejected");
      } else {
        setStatus("success");
      }
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
      <div className="flex flex-col bg-cream-50/60">
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
          <div className="w-full max-w-md rounded-2xl border border-green-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-navy">Questionnaire Received</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              We&apos;ve received your pre-screening questionnaire and will review it shortly.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              We&apos;ll let you know within 1–3 working days. If approved, we&apos;ll email you next steps to complete registration.
            </p>
            <Link href="/" className="mt-7 inline-block btn-primary px-8">
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="flex flex-col bg-cream-50/60">
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-navy">Thank You for Your Interest</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Based on your pre-screening questionnaire responses, our practice may not be the most appropriate setting for your child&apos;s current needs.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              If you have questions or concerns, please contact us directly.
            </p>
            <Link href="/" className="mt-7 inline-block btn-primary px-8">
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Pre-Screening Questionnaire</h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-wider text-cta">
            Please complete all questions
          </p>

          <p className="mt-0.5 text-xs text-cta">
            Required fields are marked with <span className="text-red-500" aria-hidden="true">*</span>.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="card space-y-6 py-6">
              <div>
                <p className={labelClass}>
                  <span className="font-semibold text-cta" aria-hidden="true">1. </span>
                  Child&apos;s age:
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
                        className="h-4 w-4 border-cream-300 text-cta focus:ring-cta"
                        required
                      />
                      <span className="text-sm text-cta">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="childResidenceAddress" className={labelClass}>
                  <span className="font-semibold text-cta" aria-hidden="true">2. </span>
                  Address where patient physically resides (California only):
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </label>
                <CaliforniaAddressAutocomplete
                  id="childResidenceAddress"
                  value={formData.childResidenceAddress ?? ""}
                  onChange={(address) => {
                    setFormData((d) => ({
                      ...d,
                      childResidenceAddress: address,
                    }));
                  }}
                  placeholder="Start typing a California address…"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <p className={labelClass}>
                  <span className="font-semibold text-cta" aria-hidden="true">3. </span>
                  Primary reason for seeking care (select all that apply):
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 space-y-2">
                  {PRIMARY_REASONS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(formData.primaryReasons ?? []).includes(opt)}
                        onChange={(e) => {
                          setErrorMessage("");
                          setPrimaryReasons(e.target.checked, opt);
                        }}
                        className="h-4 w-4 rounded border-cream-300 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-cta">{opt}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(formData.primaryReasons ?? []).includes("Other")}
                        onChange={(e) => {
                        setErrorMessage("");
                        setPrimaryReasons(e.target.checked, "Other");
                      }}
                      className="h-4 w-4 rounded border-cream-300 text-cta focus:ring-cta"
                    />
                    <span className="text-sm text-cta">Other (briefly):<span className="text-red-500" aria-hidden="true"> *</span></span>
                    <input
                      type="text"
                      value={formData.primaryReasonOther ?? ""}
                      onChange={(e) => setFormData((d) => ({ ...d, primaryReasonOther: e.target.value }))}
                      className="ml-1 flex-1 rounded border border-cream-200 px-2 py-1 text-sm text-cta"
                      placeholder="Please specify"
                      disabled={!formData.primaryReasons?.includes("Other")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-cta"><span className="font-semibold text-cta">4. </span>In the past 60 days, has your child had active suicidal thoughts or self-harm behaviors?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="activeSuicidalThoughts"
                        value="yes"
                        checked={formData.activeSuicidalThoughts === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, activeSuicidalThoughts: "yes" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                        required
                      />
                      <span className="text-sm text-cta">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="activeSuicidalThoughts"
                        value="no"
                        checked={formData.activeSuicidalThoughts === "no"}
                        onChange={() => setFormData((d) => ({ ...d, activeSuicidalThoughts: "no" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-cta">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-cta"><span className="font-semibold text-cta">5. </span>In the past 60 days, has your child had a psychiatric hospitalization or emergency room visit?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="psychiatricHospitalization"
                        value="yes"
                        checked={formData.psychiatricHospitalization === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, psychiatricHospitalization: "yes" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                        required
                      />
                      <span className="text-sm text-cta">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="psychiatricHospitalization"
                        value="no"
                        checked={formData.psychiatricHospitalization === "no"}
                        onChange={() => setFormData((d) => ({ ...d, psychiatricHospitalization: "no" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-cta">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-cta"><span className="font-semibold text-cta">6. </span>In the past 60 days, has your child had psychotic symptoms (hallucinations or delusions)?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="psychoticSymptoms"
                        value="yes"
                        checked={formData.psychoticSymptoms === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, psychoticSymptoms: "yes" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                        required
                      />
                      <span className="text-sm text-cta">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="psychoticSymptoms"
                        value="no"
                        checked={formData.psychoticSymptoms === "no"}
                        onChange={() => setFormData((d) => ({ ...d, psychoticSymptoms: "no" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-cta">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-cta"><span className="font-semibold text-cta">7. </span>In the past 60 days, has your child had severe aggression toward others?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="severeAggression"
                        value="yes"
                        checked={formData.severeAggression === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, severeAggression: "yes" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                        required
                      />
                      <span className="text-sm text-cta">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="severeAggression"
                        value="no"
                        checked={formData.severeAggression === "no"}
                        onChange={() => setFormData((d) => ({ ...d, severeAggression: "no" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-cta">No</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-cta"><span className="font-semibold text-cta">8. </span>Ongoing legal, custody, or court involvement?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="legalCustodyCourt"
                        value="yes"
                        checked={formData.legalCustodyCourt === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, legalCustodyCourt: "yes" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                        required
                      />
                      <span className="text-sm text-cta">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="legalCustodyCourt"
                        value="no"
                        checked={formData.legalCustodyCourt === "no"}
                        onChange={() => setFormData((d) => ({ ...d, legalCustodyCourt: "no" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-cta">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-cta"><span className="font-semibold text-cta">9. </span>Active child protective services involvement?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="childProtectiveServices"
                        value="yes"
                        checked={formData.childProtectiveServices === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, childProtectiveServices: "yes" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                        required
                      />
                      <span className="text-sm text-cta">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="childProtectiveServices"
                        value="no"
                        checked={formData.childProtectiveServices === "no"}
                        onChange={() => setFormData((d) => ({ ...d, childProtectiveServices: "no" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-cta">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-cta"><span className="font-semibold text-cta">10. </span>Current substance use concerns?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="substanceUseConcerns"
                        value="yes"
                        checked={formData.substanceUseConcerns === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, substanceUseConcerns: "yes" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                        required
                      />
                      <span className="text-sm text-cta">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="substanceUseConcerns"
                        value="no"
                        checked={formData.substanceUseConcerns === "no"}
                        onChange={() => setFormData((d) => ({ ...d, substanceUseConcerns: "no" }))}
                        className="h-4 w-4 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-cta">No</span>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-cta"><span className="font-semibold text-cta">11. </span>Is your child currently receiving care from a psychiatrist?<span className="text-red-500" aria-hidden="true"> *</span></span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlyReceivingCarePsychiatrist"
                          value="yes"
                          checked={formData.currentlyReceivingCarePsychiatrist === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, currentlyReceivingCarePsychiatrist: "yes" }))}
                          className="h-4 w-4 text-cta focus:ring-cta"
                          required
                        />
                        <span className="text-sm text-cta">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlyReceivingCarePsychiatrist"
                          value="no"
                          checked={formData.currentlyReceivingCarePsychiatrist === "no"}
                          onChange={() => setFormData((d) => ({ ...d, currentlyReceivingCarePsychiatrist: "no" }))}
                          className="h-4 w-4 text-cta focus:ring-cta"
                        />
                        <span className="text-sm text-cta">No</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-cta"><span className="font-semibold text-cta">12. </span>A therapist?<span className="text-red-500" aria-hidden="true"> *</span></span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlyReceivingCareTherapist"
                          value="yes"
                          checked={formData.currentlyReceivingCareTherapist === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, currentlyReceivingCareTherapist: "yes" }))}
                          className="h-4 w-4 text-cta focus:ring-cta"
                          required
                        />
                        <span className="text-sm text-cta">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlyReceivingCareTherapist"
                          value="no"
                          checked={formData.currentlyReceivingCareTherapist === "no"}
                          onChange={() => setFormData((d) => ({ ...d, currentlyReceivingCareTherapist: "no" }))}
                          className="h-4 w-4 text-cta focus:ring-cta"
                        />
                        <span className="text-sm text-cta">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className={`${labelClass} mb-2`}><span className="font-semibold text-cta">13. </span>Are you seeking:<span className="text-red-500" aria-hidden="true"> *</span></p>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.seekingOngoingCare ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, seekingOngoingCare: e.target.checked }))}
                    className="h-4 w-4 rounded border-cream-300 text-cta focus:ring-cta"
                  />
                  <span className="text-sm text-cta">Ongoing longitudinal care</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.seekingConsultation ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, seekingConsultation: e.target.checked }))}
                    className="h-4 w-4 rounded border-cream-300 text-cta focus:ring-cta"
                  />
                  <span className="text-sm text-cta">Consultation / second opinion only</span>
                </label>
              </div>

              <div>
                <label htmlFor="whatPromptedReachOut" className={labelClass}>
                  <span className="font-semibold text-cta">14. </span>
                  <span className="italic text-cta">
                    If helpful, in one sentence, please share what prompted you to reach out now. (Optional)
                  </span>
                </label>
                <textarea
                  id="whatPromptedReachOut"
                  value={formData.whatPromptedReachOut ?? ""}
                  onChange={(e) => setFormData((d) => ({ ...d, whatPromptedReachOut: e.target.value }))}
                  className={inputClass}
                  rows={3}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.understandNonUrgentCare ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, understandNonUrgentCare: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-cream-300 text-cta focus:ring-cta"
                  />
                  <span className="text-sm italic text-cta">
                    I understand this practice provides non-urgent, scheduled care only<span className="text-red-500" aria-hidden="true"> *</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.comfortableConciergeFee ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, comfortableConciergeFee: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-cream-300 text-cta focus:ring-cta"
                  />
                  <span className="text-sm italic text-cta">
                    I am comfortable with a concierge / retainer-based fee structure<span className="text-red-500" aria-hidden="true"> *</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.understandStructuredCommunication ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, understandStructuredCommunication: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-cream-300 text-cta focus:ring-cta"
                  />
                  <span className="text-sm italic text-cta">
                    I understand communication is structured and not on-demand<span className="text-red-500" aria-hidden="true"> *</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="card space-y-4 py-4">
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
              <p className="text-cta">Loading…</p>
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
