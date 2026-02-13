"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CaliforniaAddressAutocomplete } from "@/components/CaliforniaAddressAutocomplete";

const AGE_OPTIONS = ["5-8", "9-12", "13-17"] as const;
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
  /** Full address from Google Places (California only). Replaces previous state-only field. */
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
  "mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-warm-brown shadow-sm focus:border-warm-brown focus:outline-none focus:ring-1 focus:ring-warm-brown";
const labelClass = "block text-sm font-medium text-warm-brown";

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
        // Limit to 2 selections
        if (arr.length >= 2) return prev;
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
      setErrorMessage("Please select at least one primary reason for seeking care (up to 2).");
      setStatus("error");
      return;
    }
    if (reasons.length > 2) {
      setErrorMessage("Please select no more than 2 primary reasons.");
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
            <div className="rounded-md border border-cream-200 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="font-medium text-warm-brown">Thank you — we received your request.</p>
              <p className="mt-3 text-sm leading-relaxed text-warm-brown/90">
                We have received your pre-screening questionnaire and will review it shortly.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-warm-brown/90">
                We will let you know about the decision within 1–2 working days. If approved, we will email you with next steps to complete registration.
              </p>
              <Link href="/" className="mt-8 inline-block btn-primary">
                Back to Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col justify-center bg-cream-50 py-16">
          <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="card border-yellow-200 bg-yellow-50">
              <p className="font-medium text-yellow-800">Thank you for your interest.</p>
              <p className="mt-2 text-sm text-yellow-700">
                {rejectionReason}
              </p>
              <p className="mt-4 text-sm text-yellow-700">
                If you have questions or concerns, please contact us directly.
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
      <main className="min-h-screen bg-cream-50 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Pre-Screening Questionnaire</h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-wider text-warm-brown">
            Please complete all sections
          </p>

          <p className="mt-0.5 text-xs text-warm-brown">
            Required fields are marked with <span className="text-red-500" aria-hidden="true">*</span>.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* ELIGIBILITY */}
            <div className="card space-y-4 py-4">
              <h2 className="text-lg font-semibold text-warm-brown">ELIGIBILITY</h2>
              <div>
                <p className={labelClass}>
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
                        className="h-4 w-4 border-cream-300 text-warm-brown focus:ring-warm-brown"
                        required
                      />
                      <span className="text-sm text-warm-brown">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="childResidenceAddress" className={labelClass}>
                  Address where child physically resides (California only):
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
                  Primary reason for seeking care (choose up to 2):
                  <span className="text-red-500" aria-hidden="true"> *</span>
                </p>
                <div className="mt-2 space-y-2">
                  {PRIMARY_REASONS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(formData.primaryReasons ?? []).includes(opt)}
                        onChange={(e) => {
                          const current = formData.primaryReasons ?? [];
                          if (e.target.checked && current.length >= 2) {
                            setErrorMessage("You can select up to 2 primary reasons.");
                            return;
                          }
                          setErrorMessage("");
                          setPrimaryReasons(e.target.checked, opt);
                        }}
                        className="h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">{opt}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(formData.primaryReasons ?? []).includes("Other")}
                      onChange={(e) => {
                        const current = formData.primaryReasons ?? [];
                        if (e.target.checked && current.length >= 2) {
                          setErrorMessage("You can select up to 2 primary reasons.");
                          return;
                        }
                        setErrorMessage("");
                        setPrimaryReasons(e.target.checked, "Other");
                      }}
                      className="h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                    />
                    <span className="text-sm text-warm-brown">Other (briefly):<span className="text-red-500" aria-hidden="true"> *</span></span>
                    <input
                      type="text"
                      value={formData.primaryReasonOther ?? ""}
                      onChange={(e) => setFormData((d) => ({ ...d, primaryReasonOther: e.target.value }))}
                      className="ml-1 flex-1 rounded border border-cream-200 px-2 py-1 text-sm text-warm-brown"
                      placeholder="Please specify"
                      disabled={!formData.primaryReasons?.includes("Other")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* NON-ACUTE SAFETY SCREEN */}
            <div className="card space-y-4 py-4">
              <h2 className="text-lg font-semibold text-warm-brown">NON-ACUTE SAFETY SCREEN</h2>
              <p className="text-sm italic text-warm-brown">(Yes / No only)</p>
              <p className="text-sm text-warm-brown">
                In the past 60 days, has your child had:
              </p>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-warm-brown">Active suicidal thoughts or self-harm behaviors?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="activeSuicidalThoughts"
                        value="yes"
                        checked={formData.activeSuicidalThoughts === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, activeSuicidalThoughts: "yes" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        required
                      />
                      <span className="text-sm text-warm-brown">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="activeSuicidalThoughts"
                        value="no"
                        checked={formData.activeSuicidalThoughts === "no"}
                        onChange={() => setFormData((d) => ({ ...d, activeSuicidalThoughts: "no" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-warm-brown">A psychiatric hospitalization or emergency room visit?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="psychiatricHospitalization"
                        value="yes"
                        checked={formData.psychiatricHospitalization === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, psychiatricHospitalization: "yes" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        required
                      />
                      <span className="text-sm text-warm-brown">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="psychiatricHospitalization"
                        value="no"
                        checked={formData.psychiatricHospitalization === "no"}
                        onChange={() => setFormData((d) => ({ ...d, psychiatricHospitalization: "no" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-warm-brown">Psychotic symptoms (hallucinations or delusions)?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="psychoticSymptoms"
                        value="yes"
                        checked={formData.psychoticSymptoms === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, psychoticSymptoms: "yes" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        required
                      />
                      <span className="text-sm text-warm-brown">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="psychoticSymptoms"
                        value="no"
                        checked={formData.psychoticSymptoms === "no"}
                        onChange={() => setFormData((d) => ({ ...d, psychoticSymptoms: "no" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-warm-brown">Severe aggression toward others?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="severeAggression"
                        value="yes"
                        checked={formData.severeAggression === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, severeAggression: "yes" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        required
                      />
                      <span className="text-sm text-warm-brown">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="severeAggression"
                        value="no"
                        checked={formData.severeAggression === "no"}
                        onChange={() => setFormData((d) => ({ ...d, severeAggression: "no" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Questions */}
            <div className="card space-y-4 py-4">
              <h2 className="text-lg font-semibold text-warm-brown">Additional Questions</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-warm-brown">Ongoing legal, custody, or court involvement?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="legalCustodyCourt"
                        value="yes"
                        checked={formData.legalCustodyCourt === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, legalCustodyCourt: "yes" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        required
                      />
                      <span className="text-sm text-warm-brown">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="legalCustodyCourt"
                        value="no"
                        checked={formData.legalCustodyCourt === "no"}
                        onChange={() => setFormData((d) => ({ ...d, legalCustodyCourt: "no" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-warm-brown">Active child protective services involvement?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="childProtectiveServices"
                        value="yes"
                        checked={formData.childProtectiveServices === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, childProtectiveServices: "yes" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        required
                      />
                      <span className="text-sm text-warm-brown">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="childProtectiveServices"
                        value="no"
                        checked={formData.childProtectiveServices === "no"}
                        onChange={() => setFormData((d) => ({ ...d, childProtectiveServices: "no" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">No</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-warm-brown">Current substance use concerns?<span className="text-red-500" aria-hidden="true"> *</span></span>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="substanceUseConcerns"
                        value="yes"
                        checked={formData.substanceUseConcerns === "yes"}
                        onChange={() => setFormData((d) => ({ ...d, substanceUseConcerns: "yes" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        required
                      />
                      <span className="text-sm text-warm-brown">Yes</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="substanceUseConcerns"
                        value="no"
                        checked={formData.substanceUseConcerns === "no"}
                        onChange={() => setFormData((d) => ({ ...d, substanceUseConcerns: "no" }))}
                        className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                      />
                      <span className="text-sm text-warm-brown">No</span>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <p className={labelClass}>Is your child currently receiving care from:</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-warm-brown">A psychiatrist?<span className="text-red-500" aria-hidden="true"> *</span></span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlyReceivingCarePsychiatrist"
                          value="yes"
                          checked={formData.currentlyReceivingCarePsychiatrist === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, currentlyReceivingCarePsychiatrist: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlyReceivingCarePsychiatrist"
                          value="no"
                          checked={formData.currentlyReceivingCarePsychiatrist === "no"}
                          onChange={() => setFormData((d) => ({ ...d, currentlyReceivingCarePsychiatrist: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-warm-brown">A therapist?<span className="text-red-500" aria-hidden="true"> *</span></span>
                    <div className="flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlyReceivingCareTherapist"
                          value="yes"
                          checked={formData.currentlyReceivingCareTherapist === "yes"}
                          onChange={() => setFormData((d) => ({ ...d, currentlyReceivingCareTherapist: "yes" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                          required
                        />
                        <span className="text-sm text-warm-brown">Yes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="currentlyReceivingCareTherapist"
                          value="no"
                          checked={formData.currentlyReceivingCareTherapist === "no"}
                          onChange={() => setFormData((d) => ({ ...d, currentlyReceivingCareTherapist: "no" }))}
                          className="h-4 w-4 text-warm-brown focus:ring-warm-brown"
                        />
                        <span className="text-sm text-warm-brown">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Are you seeking */}
            <div className="card space-y-4 py-4">
              <h2 className="text-lg font-semibold text-warm-brown">Are you seeking:<span className="text-red-500" aria-hidden="true"> *</span></h2>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.seekingOngoingCare ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, seekingOngoingCare: e.target.checked }))}
                    className="h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                  />
                  <span className="text-sm text-warm-brown">Ongoing longitudinal care</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.seekingConsultation ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, seekingConsultation: e.target.checked }))}
                    className="h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                  />
                  <span className="text-sm text-warm-brown">Consultation / second opinion only</span>
                </label>
              </div>
            </div>

            {/* FINANCIAL & MODEL CONFIRMATION */}
            <div className="card space-y-4 py-4">
              <h2 className="text-lg font-semibold text-warm-brown">FINANCIAL & MODEL CONFIRMATION</h2>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.understandNonUrgentCare ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, understandNonUrgentCare: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                  />
                  <span className="text-sm italic text-warm-brown">
                    I understand this practice provides non-urgent, scheduled care only<span className="text-red-500" aria-hidden="true"> *</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.comfortableConciergeFee ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, comfortableConciergeFee: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                  />
                  <span className="text-sm italic text-warm-brown">
                    I am comfortable with a concierge / retainer-based fee structure<span className="text-red-500" aria-hidden="true"> *</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.understandStructuredCommunication ?? false}
                    onChange={(e) => setFormData((d) => ({ ...d, understandStructuredCommunication: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-cream-300 text-warm-brown focus:ring-warm-brown"
                  />
                  <span className="text-sm italic text-warm-brown">
                    I understand communication is structured and not on-demand<span className="text-red-500" aria-hidden="true"> *</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Optional prompt */}
            <div className="card space-y-4 py-4">
              <label htmlFor="whatPromptedReachOut" className={labelClass}>
                <span className="italic text-warm-brown">
                  If helpful, in one sentence, please share what prompted you to reach out now.
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
