"use client";

import { motion, useAnimation } from "framer-motion";
import type { Variants } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease } },
};

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
      "You'll receive a clear summary of impressions and a personalized care plan—therapy recommendations, skills-based supports, and medication options when clinically indicated—delivered via secure telehealth.",
    ],
    image: "/services/psychiatricevaluation-v2.png",
    alt: "Professional consultation",
  },
  {
    title: "Psychotherapy",
    description: [
      "Evidence-based therapy tailored to emotional well-being and development. Sessions may be individual, family-based, or a combination depending on age and needs.",
      "We focus on practical skills—emotion regulation, coping strategies, communication, and problem-solving—using secure telehealth so care fits real-life schedules.",
    ],
    image: "/services/psychotherapy-v2.png",
    alt: "Calm and wellness",
  },
  {
    title: "Medication Management",
    description: [
      "Thoughtful medication assessment and ongoing management when clinically indicated. We review benefits, risks, and alternatives, and how medication fits with therapy and school supports.",
      "Follow-ups track symptoms, side effects, sleep/appetite, and day-to-day functioning. With consent, we can coordinate with your care team to keep treatment aligned.",
    ],
    image: "/services/medicationmanagement-v2.png",
    alt: "Medication and care",
  },
  {
    title: "Follow-up Care",
    description: [
      "Ongoing support and monitoring to maintain progress and adjust the plan as needs change. Regular check-ins strengthen coping skills across home, school, and relationships.",
      "We revisit goals, track symptoms over time, and refine strategies for sleep, routines, and stress management—so your family has continuity and clear next steps.",
    ],
    image: "/services/followupcare-v4.png",
    alt: "Ongoing support and care",
  },
];

function IntroCard({ onWave }: { onWave: () => void }) {
  return (
    <motion.div
      variants={cardVariant}
      className="relative col-span-2 flex min-h-[260px] flex-col overflow-hidden rounded-2xl bg-[#8FA88A] p-6 text-navy shadow-[0_4px_20px_rgba(0,0,0,0.08)] sm:col-span-1 sm:min-h-[420px] sm:p-8"
    >
      {/* Animated blob accent */}
      <motion.div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured Services</h2>
      <p className="mt-2 text-base font-medium text-navy/90 sm:text-lg">What We Offer</p>
      <p className="mt-4 text-sm leading-relaxed text-navy/90">
        Personalized psychiatric care for children, adolescents, and young adults—evaluation, therapy, medication management, and ongoing support.
      </p>
      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={onWave}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-cta shadow transition hover:scale-110 hover:bg-white active:scale-95"
          aria-label="Wave services"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

function ServiceCard({ service, wave, index }: { service: Service; wave: number; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const waveControls = useAnimation();

  useEffect(() => {
    if (wave === 0) return;
    waveControls.start({
      y: [0, -22, 0],
      transition: { delay: index * 0.13, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    });
  }, [wave]);

  return (
    // Outer div handles wave bounce; inner motion.div handles stagger entry + hover
    <motion.div animate={waveControls} className="min-h-[340px] sm:min-h-[480px]">
      <motion.div
        variants={cardVariant}
        whileHover={{ y: -6, transition: { duration: 0.25, ease: "easeOut" } }}
        className="flex h-full min-h-[340px] flex-col overflow-hidden rounded-2xl bg-cream-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:min-h-[480px]"
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
              {/* Front */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]">
                <div className="relative h-full w-full bg-gray-100">
                  <Image
                    src={service.image}
                    alt={service.alt}
                    fill
                    loading="lazy"
                    className="object-cover object-[50%_18%] transition duration-500 group-hover:scale-105 sm:object-[50%_28%] lg:object-center"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 22vw"
                  />
                  {/* Top gradient + title */}
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
                  <div className="absolute inset-x-0 top-0 flex flex-col items-center px-4 pt-5 text-center">
                    <p className="text-base font-bold uppercase tracking-widest text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] sm:text-lg">{service.title}</p>
                  </div>
                  {/* Bottom flip hint */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
                  <div className="absolute bottom-4 right-4">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-cta shadow-lg ring-1 ring-black/5">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-cream-200 p-6 text-gray-700 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <h3 className="text-xl font-semibold text-cta sm:text-2xl">{service.title}</h3>
                <div className="mt-3 flex-1 overflow-auto pr-2 [-webkit-overflow-scrolling:touch]">
                  <p className="text-base leading-relaxed text-gray-600">{service.description[0]}</p>
                  <p className="mt-3 text-base leading-relaxed text-gray-600">{service.description[1]}</p>
                </div>
              </div>
            </div>
          </div>
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Services() {
  const [wave, setWave] = useState(0);

  return (
    <section id="services" className="relative overflow-hidden py-28 sm:py-36">
      <div className="absolute inset-0 z-0">
        <Image src="/services-bg.png" alt="" fill loading="lazy" className="object-cover object-center" sizes="100vw" />
        <div className="absolute inset-0 bg-white/40" aria-hidden />
      </div>

      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease }}
        >
          <h2 className="section-heading section-heading-accent mb-12 text-3xl md:mb-16 md:text-4xl">Services</h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-4 sm:gap-8 lg:gap-6 lg:items-stretch lg:[grid-template-columns:0.85fr_repeat(4,1.15fr)]"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          <IntroCard onWave={() => setWave((w) => w + 1)} />
          {services.map((service, i) => (
            <ServiceCard key={service.title} service={service} wave={wave} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
