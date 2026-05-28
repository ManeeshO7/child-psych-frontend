"use client";

import { motion, useInView } from "framer-motion";
import type { Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { Brain, ShieldCheck, Video, HeartHandshake } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.75, ease } },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.75, ease } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const duration = 1400;
    const steps = 50;
    const increment = value / steps;
    const interval = duration / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, interval);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <div ref={ref} className="relative text-left">
      <p className="text-4xl font-bold tabular-nums text-navy">
        {count}{suffix}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-700">{label}</p>
      <motion.div
        initial={{ width: 0 }}
        animate={inView ? { width: "100%" } : {}}
        transition={{ duration: 1.2, delay: 0.3, ease }}
        className="mt-2 h-0.5 rounded-full bg-cta/30"
      />
    </div>
  );
}

const cards = [
  {
    title: "Personalized Care",
    desc: "Tailored treatment plans built around each patient's unique history, needs, and goals.",
    iconBg: "bg-cta/10 text-cta",
    icon: <Brain className="h-5 w-5" strokeWidth={1.6} />,
  },
  {
    title: "HIPAA Compliant",
    desc: "End-to-end encrypted sessions with full regulatory compliance and patient privacy.",
    iconBg: "bg-emerald-500/10 text-emerald-600",
    icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.6} />,
  },
  {
    title: "Convenient Access",
    desc: "Care from home on your schedule — no commute, no waiting rooms, no barriers.",
    iconBg: "bg-violet-500/10 text-violet-600",
    icon: <Video className="h-5 w-5" strokeWidth={1.6} />,
  },
  {
    title: "Compassionate",
    desc: "An empathy-first, judgment-free environment where every concern is heard and respected.",
    iconBg: "bg-rose-500/10 text-rose-500",
    icon: <HeartHandshake className="h-5 w-5" strokeWidth={1.6} />,
  },
];

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden py-28 sm:py-36">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/about-bg.png"
          alt="Calming therapy office background"
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/50" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">

          {/* Left: text */}
          <motion.div
            className="flex flex-col justify-center"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
          >
            {/* Eyebrow badge */}
            <motion.div variants={fadeLeft}>
              <span className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cta animate-pulse" />
                Our Practice
              </span>
            </motion.div>

            <motion.h2 variants={fadeLeft} className="mt-4 section-heading section-heading-accent text-3xl md:text-4xl">
              About TelePsych
            </motion.h2>

            <motion.p variants={fadeUp} className="mt-6 text-base leading-relaxed text-gray-800">
              I provide personalized, evidence-based psychiatric care through secure telepsychiatry for children and adolescents, located in California. My practice offers a thoughtful, concierge-level approach that integrates psychiatric expertise, psychotherapy, and practical life strategies to support emotional well-being, development, and long-term resilience.
            </motion.p>

            <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-gray-800">
              All services are delivered virtually, allowing for discreet, flexible, and high-quality care while maintaining the same clinical standards as in-person psychiatry.
            </motion.p>

            {/* Animated Stats */}
            <motion.div variants={fadeUp} className="mt-10 grid grid-cols-3 gap-6">
              <AnimatedStat value={10} suffix="+" label="Years Experience" />
              <AnimatedStat value={500} suffix="+" label="Patients Served" />
              <AnimatedStat value={100} suffix="%" label="Telehealth" />
            </motion.div>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-3">
              <Link href="/how-it-works" className="inline-flex items-center justify-center gap-2 rounded-xl border border-cta/60 bg-white/90 px-5 py-2.5 text-sm font-medium text-cta transition-all duration-200 hover:bg-white group">
                Learn More
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/request-access" className="btn-primary inline-flex items-center gap-2 group">
                Request Access
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right: feature cards */}
          <motion.div
            variants={fadeRight}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            className="flex items-center justify-center"
          >
            <div className="relative w-full max-w-sm">
              {/* Static decorative accents — no infinite animations to avoid GPU jank */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-cta/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl" />

              <div className="relative space-y-3">
                {cards.map((card, i) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, x: 28 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.12, duration: 0.6, ease }}
                    whileHover={{ x: 6, transition: { duration: 0.2 } }}
                    className={`group flex items-start gap-4 rounded-2xl bg-white/90 px-5 py-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} transition-transform group-hover:scale-110`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{card.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-700">{card.desc}</p>
                    </div>
                    <svg className="ml-auto mt-1 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
