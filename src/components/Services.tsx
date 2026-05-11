'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useInView } from "@/hooks/useInView";

type Service = {
  title: string;
  description: [string, string];
  image: string;
  alt: string;
};

const services: Service[] = [
  {
    title: "Psychiatric Evaluation",
    description: [
      "Comprehensive evaluations for children and adolescents, with parent/guardian input when appropriate. We review symptoms, developmental history, and school/family context to understand the full picture.",
      "You’ll receive a clear summary of impressions and a personalized care plan—therapy recommendations, skills-based supports, and medication options when clinically indicated—delivered via secure telehealth.",
    ],
    image: "/services/psychiatricevaluation.png",
    alt: "Professional consultation",
  },
  {
    title: "Psychotherapy",
    description: [
      "Evidence-based therapy tailored to emotional well-being and development. Sessions may be individual, family-based, or a combination depending on age and needs.",
      "We focus on practical skills—emotion regulation, coping strategies, communication, and problem-solving—using secure telehealth so care fits real-life schedules.",
    ],
    image: "/services/psychotheraphy.png",
    alt: "Calm and wellness",
  },
  {
    title: "Medication Management",
    description: [
      "Thoughtful medication assessment and ongoing management when clinically indicated. We review benefits, risks, and alternatives, and how medication fits with therapy and school supports.",
      "Follow-ups track symptoms, side effects, sleep/appetite, and day-to-day functioning. With consent, we can coordinate with your care team to keep treatment aligned.",
    ],
    image: "/services/medicationmanagement.png",
    alt: "Medication and care",
  },
  {
    title: "Follow-up Care",
    description: [
      "Ongoing support and monitoring to maintain progress and adjust the plan as needs change. Regular check-ins strengthen coping skills across home, school, and relationships.",
      "We revisit goals, track symptoms over time, and refine strategies for sleep, routines, and stress management—so your family has continuity and clear next steps.",
    ],
    image: "/services/followupcare-v3.png",
    alt: "Ongoing support and care",
  },
];

function IntroCard() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`relative col-span-2 flex min-h-[260px] flex-col overflow-hidden rounded-2xl bg-[#8FB5C1] p-6 text-navy shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-700 ease-out will-change-transform sm:col-span-1 sm:min-h-[420px] sm:p-8 ${
        inView
          ? "translate-x-0 translate-y-0 scale-100 opacity-100 blur-0"
          : "-translate-x-8 translate-y-6 scale-[0.96] opacity-0 blur-[2px]"
      }`}
    >
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Featured Services
      </h2>
      <p className="mt-2 text-base font-medium text-navy/90 sm:text-lg">
        What We Offer
      </p>
      <p className="mt-4 text-sm leading-relaxed text-navy/90">
        Personalized psychiatric care for children, adolescents, and young adults—evaluation, therapy, medication management, and ongoing support.
      </p>
      <div className="mt-auto pt-8">
        <Link
          href="/#services"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-cta shadow transition hover:bg-white"
          aria-label="View services"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [flipped, setFlipped] = useState(false);
  const initialOffsetX = index % 2 === 0 ? "translate-x-8" : "-translate-x-8";

  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${120 + index * 90}ms` : "0ms" }}
      className={`group flex min-h-[340px] flex-col overflow-hidden rounded-2xl bg-cream-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-700 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:min-h-[480px] ${
        inView
          ? "translate-x-0 translate-y-0 scale-100 opacity-100 blur-0"
          : `${initialOffsetX} translate-y-6 scale-[0.96] opacity-0 blur-[2px]`
      }`}
    >
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="relative flex h-full min-h-[340px] w-full flex-1 cursor-pointer flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/60 sm:min-h-[480px]"
        aria-pressed={flipped}
        aria-label={`${service.title}. ${flipped ? "Hide details" : "Show details"}`}
      >
        <div className="relative h-full w-full flex-1 [perspective:1200px]">
          <div
            className={`relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none [transform-style:preserve-3d] ${
              flipped ? "[transform:rotateY(180deg)]" : ""
            }`}
          >
            {/* Front: image + title */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]">
              <div className="relative h-full w-full bg-gray-100">
                <Image
                  src={service.image}
                  alt={service.alt}
                  fill
                  className="object-cover object-[50%_18%] transition duration-500 group-hover:scale-105 sm:object-[50%_28%] lg:object-center"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 22vw"
                />
                <div className="absolute bottom-5 right-5">
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-cta shadow-[0_8px_20px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition group-hover:bg-white"
                    aria-hidden="true"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Back: description */}
            <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-cream-200 p-6 text-gray-700 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <h3 className="text-xl font-semibold text-cta sm:text-2xl">
                {service.title}
              </h3>
              <div className="mt-3 flex-1 overflow-auto pr-2 [-webkit-overflow-scrolling:touch]">
                <div className="space-y-3">
                  <p className="text-base leading-relaxed text-gray-600">
                    {service.description[0]}
                  </p>
                  <p className="text-base leading-relaxed text-gray-600">
                    {service.description[1]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function Services() {
  return (
    <section id="services" className="relative overflow-hidden py-28 sm:py-36">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/3.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority={false}
        />
        <div className="absolute inset-0 bg-white/15" aria-hidden />
      </div>
      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading section-heading-accent mb-12 text-3xl md:mb-16 md:text-4xl">Services</h2>
        <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:gap-6 lg:items-stretch lg:[grid-template-columns:0.85fr_repeat(4,1.15fr)]">
          <IntroCard />
          {services.map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
