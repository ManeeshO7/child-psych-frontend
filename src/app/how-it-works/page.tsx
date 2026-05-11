import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FaqAccordion from "@/components/FaqAccordion";

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero — soft gradient (section1.png) */}
        <section className="relative min-h-[420px] w-full overflow-hidden py-24 sm:min-h-[480px] sm:py-32">
          <div className="pointer-events-none absolute inset-0 z-0 bg-cream-50">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/section1.png)" }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-white/35" aria-hidden />
          </div>
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
            <h1 className="section-heading text-3xl text-navy sm:text-4xl md:text-5xl">
              How TelePsych Works
            </h1>
            <p className="mt-4 text-lg text-gray-700 sm:text-xl">
              Getting started is simple. Request access to our secure patient portal, complete your profile, and book your first appointment—all online.
            </p>
            <p className="mt-3 text-base font-medium text-gray-700">
              Most new patients book their first visit within a few days.
            </p>
          </div>
        </section>

        {/* Your care journey — timeline */}
        <section className="bg-cream-50 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="section-heading section-heading-accent text-2xl sm:text-3xl">
              Your care journey
            </h2>
            <div className="mt-10 relative">
              {/* Vertical timeline line */}
              <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-cta/30 sm:left-6" aria-hidden />
              <ol className="space-y-0">
                {[
                  {
                    step: 1,
                    title: "Request Access",
                    body: "Submit a short request form so we can confirm that our practice is a good clinical fit for your child.",
                  },
                  {
                    step: 2,
                    title: "Receive Approval",
                    body: "Once approved, you will receive login credentials to access the secure patient portal.",
                  },
                  {
                    step: 3,
                    title: "Complete Intake Forms",
                    body: "Fill out basic information, preferred pharmacy, and any required clinical intake forms before your visit.",
                  },
                  {
                    step: 4,
                    title: "Schedule Your Appointment",
                    body: "Choose an available time for your first telehealth consultation.",
                  },
                  {
                    step: 5,
                    title: "Attend Your Video Visit",
                    body: "Meet with your doctor through a secure video session from the comfort of your home.",
                  },
                ].map(({ step, title, body }) => (
                  <li key={step} className="relative flex gap-6 pb-10 last:pb-0">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-cta bg-cream-50 text-sm font-bold text-cta sm:h-12 sm:w-12 sm:text-base"
                      aria-hidden
                    >
                      {step}
                    </span>
                    <div className="flex-1 pt-0.5">
                      <h3 className="font-semibold text-navy">
                        Step {step} — {title}
                      </h3>
                      <p className="mt-2 text-base leading-relaxed text-gray-700">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* How to get started — white */}
        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="section-heading section-heading-accent text-2xl sm:text-3xl">
              How to get started
            </h2>
            <ol className="mt-6 space-y-6 text-base leading-relaxed text-gray-700">
              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cta/10 text-cta" aria-hidden>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <div>
                  <span className="font-semibold text-navy">Request access</span>
                  <p className="mt-1">
                    Complete the short request form so we can confirm that our practice is a good clinical fit.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cta/10 text-cta" aria-hidden>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <span className="font-semibold text-navy">Receive approval</span>
                  <p className="mt-1">
                    Once approved, you will receive login credentials for your secure patient portal.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cta/10 text-cta" aria-hidden>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <div>
                  <span className="font-semibold text-navy">Complete your profile</span>
                  <p className="mt-1">
                    Fill in basic patient details, contact information, preferred pharmacy, and guardian information if applicable.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cta/10 text-cta" aria-hidden>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <span className="font-semibold text-navy">Schedule your first visit</span>
                  <p className="mt-1">
                    Choose an available appointment time for your initial consultation.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Appointment types — soft cream */}
        <section className="bg-cream-50 py-16 sm:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <h2 className="section-heading section-heading-accent text-2xl sm:text-3xl">
              Appointment types
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-1 lg:grid-cols-3">
              <div className="rounded-[14px] border border-cream-300 bg-cream-50/70 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1.5 hover:border-cta/20 hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)] min-w-0">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cta/15 text-cta" aria-hidden>
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </span>
                <h3 className="mt-4 font-semibold text-navy">Orientation consultation</h3>
                <span className="mt-3 inline-block rounded-lg border border-cta/30 bg-cta/10 px-4 py-2 text-lg font-bold text-cta">
                  30 minutes
                </span>
                <div className="mt-4 h-px w-14 bg-cta/25" aria-hidden />
                <p className="mt-4 text-sm leading-relaxed text-gray-700">
                  Introductory visit to understand your concerns and explain how our practice works.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                  <li>• Review current concerns</li>
                  <li>• Discuss care approach</li>
                  <li>• Determine next steps</li>
                </ul>
              </div>
              <div className="rounded-[14px] border border-cream-300 bg-cream-50/70 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1.5 hover:border-cta/20 hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)] min-w-0">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cta/15 text-cta" aria-hidden>
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <h3 className="mt-4 font-semibold text-navy">Clinical intake</h3>
                <span className="mt-3 inline-block rounded-lg border border-cta/30 bg-cta/10 px-4 py-2 text-lg font-bold text-cta">
                  75 minutes
                </span>
                <div className="mt-4 h-px w-14 bg-cta/25" aria-hidden />
                <p className="mt-4 text-sm leading-relaxed text-gray-700">
                  A comprehensive psychiatric evaluation to understand symptoms, history, and treatment needs.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                  <li>• Review medical & mental health history</li>
                  <li>• Discuss symptoms and goals</li>
                  <li>• Develop initial treatment plan</li>
                </ul>
              </div>
              <div className="rounded-[14px] border border-cream-300 bg-cream-50/70 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1.5 hover:border-cta/20 hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)] min-w-0">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cta/15 text-cta" aria-hidden>
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </span>
                <h3 className="mt-4 font-semibold text-navy">Follow-up visits</h3>
                <span className="mt-3 inline-block rounded-lg border border-cta/30 bg-cta/10 px-4 py-2 text-lg font-bold text-cta">
                  30–45 minutes
                </span>
                <div className="mt-4 h-px w-14 bg-cta/25" aria-hidden />
                <p className="mt-4 text-sm leading-relaxed text-gray-700">
                  Ongoing appointments to monitor progress and adjust treatment as needed.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                  <li>• Medication management</li>
                  <li>• Progress check-ins</li>
                  <li>• Treatment adjustments</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* After your first visit */}
        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="section-heading section-heading-accent text-2xl sm:text-3xl">
              After your first appointment
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              After your evaluation, your doctor may:
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-start">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cta/15 text-cta" aria-hidden>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </span>
                <h3 className="mt-3 font-semibold text-navy">Diagnosis</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">Identify the condition when appropriate.</p>
              </div>
              <div className="flex flex-col items-start">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cta/15 text-cta" aria-hidden>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <h3 className="mt-3 font-semibold text-navy">Treatment plan</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">Recommend therapy or other options.</p>
              </div>
              <div className="flex flex-col items-start">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cta/15 text-cta" aria-hidden>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </span>
                <h3 className="mt-3 font-semibold text-navy">Medication support</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">Prescribe medication when clinically indicated.</p>
              </div>
              <div className="flex flex-col items-start">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cta/15 text-cta" aria-hidden>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <h3 className="mt-3 font-semibold text-navy">Follow-up care</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">Schedule monitoring visits to track progress.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Patient portal — white */}
        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="section-heading section-heading-accent text-2xl sm:text-3xl">
              Your secure patient portal
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              Our portal makes it easy to manage your care online.
            </p>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h3 className="font-semibold text-navy">Appointments</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
                  <li>• Schedule or reschedule visits</li>
                  <li>• Join video sessions</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-navy">Health & Records</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
                  <li>• Complete intake forms</li>
                  <li>• View past appointments</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-navy">Account</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
                  <li>• Update pharmacy & contact info</li>
                  <li>• Manage billing</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Secure care + FAQ — section4.png background + light sage */}
        <section className="relative min-h-[400px] overflow-hidden py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 z-0 bg-cream-50">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/section4.png)" }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-white/40" aria-hidden />
          </div>
          <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="section-heading section-heading-accent text-2xl sm:text-3xl">
              Secure and private care
            </h2>
            <p className="mt-5 text-base font-medium text-navy">
              Protecting your privacy is a top priority.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              Our platform uses secure, encrypted telehealth technology designed to protect your personal health information and meet healthcare security standards.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              All appointments take place through secure video visits, allowing families to access care safely from home.
            </p>
            <div className="mt-8 flex flex-wrap gap-6">
              <span className="inline-flex items-center gap-3 rounded-xl border border-cta/30 bg-white/90 px-5 py-3 text-sm font-medium text-navy shadow-sm">
                <svg className="h-6 w-6 shrink-0 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                HIPAA-aware platform
              </span>
              <span className="inline-flex items-center gap-3 rounded-xl border border-cta/30 bg-white/90 px-5 py-3 text-sm font-medium text-navy shadow-sm">
                <svg className="h-6 w-6 shrink-0 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Encrypted video visits
              </span>
              <span className="inline-flex items-center gap-3 rounded-xl border border-cta/30 bg-white/90 px-5 py-3 text-sm font-medium text-navy shadow-sm">
                <svg className="h-6 w-6 shrink-0 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Secure patient portal
              </span>
            </div>

            <h2 className="section-heading section-heading-accent mt-16 text-2xl sm:text-3xl">
              Common questions
            </h2>
            <FaqAccordion
              items={[
                { question: "How long does approval take?", answer: "Most access requests are reviewed within 1–2 business days." },
                { question: "Do I need to install any software for video visits?", answer: "No. Appointments take place through a secure link that works in most modern web browsers." },
                { question: "Can parents attend appointments?", answer: "Yes. For children and adolescents, a parent or guardian is typically involved in the visit." },
                { question: "What if I need to reschedule?", answer: "Appointments can be rescheduled directly through the patient portal." },
              ]}
            />
            <Link
              href="/faq"
              className="mt-6 inline-block font-medium text-cta hover:underline"
            >
              View full FAQ →
            </Link>
          </div>
        </section>

        {/* CTA — gradient */}
        <section className="bg-section-cta-gradient py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="section-heading text-2xl text-navy sm:text-3xl">
              Ready to begin care?
            </h2>
            <p className="mt-4 text-base text-gray-700 sm:text-lg">
              Getting started takes only a few minutes.
              Request access to the patient portal and schedule your first visit.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/request-access"
                className="btn-primary inline-flex items-center px-6 py-3 text-base font-medium"
              >
                Request Access
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl border-2 border-cta bg-white px-6 py-3 text-base font-medium text-cta transition hover:bg-cream-100"
              >
                Patient Login
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
