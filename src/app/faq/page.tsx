"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/** Renders a string with **bold** markers as text and <strong> elements. */
function renderWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-warm-brown">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

const faqs = [
  {
    q: "Where are you licensed to provide care?",
    a: "I provide psychiatric services to patients who are **physically located in the State of California** at the time of each appointment. California law requires that patients be present in the state for **every telehealth visit**, including follow-up appointments.",
  },
  {
    q: "What age groups do you work with?",
    a: "My practice serves **children, adolescents, and young adults between the ages of 5 and 25.**",
  },
  {
    q: "What types of concerns is your practice best suited for?",
    a: "This practice focuses on **outpatient psychiatric care for individuals with mild to moderate mental health concerns** who are clinically stable and appropriate for telehealth treatment. I commonly work with patients experiencing:\n\n• Anxiety-related concerns\n• Depressive symptoms\n• Attention and executive functioning difficulties (ADHD)\n• Obsessive or compulsive symptoms\n• Tic disorders\n• Emotional or behavioral regulation difficulties\n• Stress related to school, family, or developmental transitions\n\nMy practice is **intentionally limited in scope** and is not designed to meet high-acuity or intensive treatment needs.",
  },
  {
    q: "What types of treatment do you offer?",
    a: "Treatment plans are individualized and may include **psychiatric medication, psychotherapy, and parent support**, depending on clinical needs and availability.\n\nCare is grounded in **evidence-based psychiatric practice.** I often use standardized rating scales and questionnaires to monitor symptoms and track progress over time, while tailoring treatment to each patient's developmental stage and family context.",
  },
  {
    q: "Is psychotherapy required?",
    a: "I strongly recommend that all patients engage in psychotherapy as part of comprehensive mental health care.\n\n• If a patient already has a therapist, I can provide medication management and collaborate with the existing provider when appropriate.\n• If a patient does not have a therapist, I may be able to provide psychotherapy as part of treatment, depending on availability and clinical appropriateness.",
  },
  {
    q: "How do I request an appointment?",
    a: "To request services, use the **\"Get Started\"** or **\"Contact\"** option on the website and complete the brief intake request form.\n\nAfter reviewing your information, you will be contacted by email to discuss the appropriateness of scheduling an intake appointment. All email communication related to intake and scheduling is provided at no charge.",
  },
  {
    q: "What does the intake process involve?",
    a: "The intake process typically occurs over **two separate appointments**, scheduled at least one week apart.\n\n        • During the first visit, I gather a detailed history and begin developing an initial understanding of concerns and goals.\n        • During the second visit, I provide diagnostic impressions when appropriate and discuss treatment recommendations.\n\nAt the conclusion of the intake process, we will decide together whether to proceed with ongoing care or conclude the consultation.",
  },
  {
    q: "When is a doctor-patient relationship established?",
    a: "A physician-patient relationship is established **only after the intake process is completed** and both parties agree to move forward with treatment.\n\nInitial contact, screening, or consultation alone does not establish ongoing care.",
  },
  {
    q: "How frequently are follow-up visits scheduled?",
    a: "Follow-up frequency varies based on individual clinical needs.\n\n        • Some patients may be seen as frequently as **twice per week**.\n        • All patients must be seen **at least once every three months** to remain active in the practice. This is medically necessary for safe monitoring and continuity of care.\n\nIf a higher level of care is needed, I will recommend appropriate alternatives such as **Intensive Outpatient Programs (IOP)** or **Partial Hospitalization Programs (PHP).**",
  },
  {
    q: "Do you accept health insurance?",
    a: "I am not contracted with insurance companies.\n\nI can provide a **superbill** or receipt for out-of-network reimbursement. Because coverage varies widely, I encourage patients to verify benefits directly with their insurance provider prior to starting treatment.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Payment is accepted via all major credit cards, including **Visa, Mastercard, American Express, and Discover.**\n\nA credit card must be kept on file prior to the first appointment. **HSA and FSA funds** may also be used.",
  },
  {
    q: "Is telepsychiatry appropriate for everyone?",
    a: "Telepsychiatry can be effective for many individuals but is not appropriate in all situations. Individuals who may require in-person or higher levels of care include those with:\n\n        • Frequent suicidal thoughts or self-harm behaviors\n        • Severe or rapidly worsening symptoms\n        • A need for crisis or emergency services\n        • Very young children (under age 5)\n\nI am happy to review concerns prior to scheduling to help determine whether telehealth care is an appropriate fit.",
  },
  {
    q: "Do you provide emergency or crisis services?",
    a: "No. This practice does **not** provide emergency, crisis, or after-hours urgent services.\n\nIf you or your child **are** experiencing a psychiatric emergency, please contact **911**, visit the nearest emergency department, or contact a local crisis service.",
  },
  {
    q: "What policies and consent forms are required?",
    a: "If I determine that we may be a good fit, you will receive electronic forms including:\n\n        • Practice policies\n        • Privacy notice (HIPAA)\n        • Telehealth consent\n        • No Surprises Act notice\n\nAll forms must be completed before the first appointment.",
  },
  {
    q: "What is your cancellation policy?",
    a: "Appointments must be canceled or rescheduled with **at least 48 business hours' notice.**\n\nLate cancellations and missed appointments are charged the full session fee, as insurance does not reimburse for no-shows.\n\nPatient emergencies are reviewed on a case-by-case basis.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <Header />
      <main className="relative min-h-screen overflow-hidden py-16">
        <div className="absolute inset-0 z-0">
          <Image
            src="/4.jpeg"
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority={false}
          />
          <div className="absolute inset-0 bg-white/50" aria-hidden />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading text-center">FAQs</h1>
          <p className="mt-2 text-center text-sm font-medium uppercase tracking-wider text-warm-brown">
            Frequently Asked Questions
          </p>
          <div className="mt-12 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-cream-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-cream-50/50"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-question-${index}`}
                  >
                    <span className="font-semibold text-warm-brown">{faq.q}</span>
                    <span
                      className="flex shrink-0 items-center justify-center text-lg font-bold text-warm-brown transition-colors"
                      aria-hidden
                    >
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-question-${index}`}
                      className="border-t border-cream-200/80 bg-cream-50/30"
                    >
                      <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-warm-brown">
                        {renderWithBold(faq.a)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-10 text-center">
            <a href="/#contact" className="btn-primary inline-flex">
              Contact Us
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
