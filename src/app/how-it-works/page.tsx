"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FaqAccordion from "@/components/FaqAccordion";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ClipboardList, Mail, Calendar, Video,
  ShieldCheck, Lock, FolderOpen,
  FileText, Stethoscope, Pill, CalendarCheck,
  MapPin, LayoutDashboard, User,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
};

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.65, ease } },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.65, ease } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const steps = [
  { step: 1, icon: ClipboardList, title: "Request Access", body: "Submit a short request form so we can confirm that our practice is a good clinical fit for your child." },
  { step: 2, icon: Mail, title: "Receive Approval", body: "Once approved, you will receive login credentials to access the secure patient portal." },
  { step: 3, icon: FileText, title: "Complete Intake Forms", body: "Fill out basic information, preferred pharmacy, and any required clinical intake forms before your visit." },
  { step: 4, icon: Calendar, title: "Schedule Your Appointment", body: "Choose an available time for your first telehealth consultation." },
  { step: 5, icon: Video, title: "Attend Your Video Visit", body: "Meet with your doctor through a secure video session from the comfort of your home." },
];

const appointmentTypes = [
  {
    title: "Orientation Consultation",
    duration: "30 minutes",
    desc: "Introductory visit to understand your concerns and explain how our practice works.",
    bullets: ["Review current concerns", "Discuss care approach", "Determine next steps"],
    iconBg: "bg-cta/10 text-cta",
    accent: "from-cta/5 to-cta/10",
    icon: <MapPin className="h-7 w-7" strokeWidth={1.5} />,
    featured: false,
  },
  {
    title: "Clinical Intake",
    duration: "75 minutes",
    desc: "A comprehensive psychiatric evaluation to understand symptoms, history, and treatment needs.",
    bullets: ["Review medical & mental health history", "Discuss symptoms and goals", "Develop initial treatment plan"],
    iconBg: "bg-cta/10 text-cta",
    accent: "from-cta/5 to-cta/10",
    icon: <Stethoscope className="h-7 w-7" strokeWidth={1.5} />,
    featured: true,
  },
  {
    title: "Follow-up Visits",
    duration: "30–45 minutes",
    desc: "Ongoing appointments to monitor progress and adjust treatment as needed.",
    bullets: ["Medication management", "Progress check-ins", "Treatment adjustments"],
    iconBg: "bg-cta/10 text-cta",
    accent: "from-cta/5 to-cta/10",
    icon: <CalendarCheck className="h-7 w-7" strokeWidth={1.5} />,
    featured: false,
  },
];

const afterVisit = [
  { icon: <FileText className="h-6 w-6" strokeWidth={1.5} />, title: "Diagnosis", desc: "Identify the condition when clinically appropriate.", color: "bg-cta/10 text-cta", glow: "rgba(122,158,132,0.15)" },
  { icon: <ClipboardList className="h-6 w-6" strokeWidth={1.5} />, title: "Treatment Plan", desc: "Recommend therapy, psychotherapy, or other evidence-based options.", color: "bg-cta/10 text-cta", glow: "rgba(122,158,132,0.15)" },
  { icon: <Pill className="h-6 w-6" strokeWidth={1.5} />, title: "Medication Support", desc: "Prescribe medication when clinically indicated and appropriate.", color: "bg-cta/10 text-cta", glow: "rgba(122,158,132,0.15)" },
  { icon: <CalendarCheck className="h-6 w-6" strokeWidth={1.5} />, title: "Follow-up Care", desc: "Schedule monitoring visits to track progress and adjust care.", color: "bg-cta/10 text-cta", glow: "rgba(122,158,132,0.15)" },
];

const portalFeatures = [
  { icon: <Calendar className="h-6 w-6" strokeWidth={1.5} />, title: "Appointments", bullets: ["Schedule or reschedule visits", "Join secure video sessions"], color: "bg-cta/10 text-cta", barColor: "bg-cta" },
  { icon: <LayoutDashboard className="h-6 w-6" strokeWidth={1.5} />, title: "Health & Records", bullets: ["Complete intake forms", "View past appointment notes"], color: "bg-cta/10 text-cta", barColor: "bg-cta" },
  { icon: <User className="h-6 w-6" strokeWidth={1.5} />, title: "Account", bullets: ["Update pharmacy & contact info", "Manage billing & payments"], color: "bg-cta/10 text-cta", barColor: "bg-cta" },
];

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main className="bg-gradient-to-br from-[#f5f0e8] via-[#eef4ec] to-[#e2ede4]">

        {/* ── Hero ── */}
        <section className="relative min-h-[460px] w-full overflow-hidden py-28 sm:py-36">
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cta/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-cta/8 blur-3xl" />

          <motion.div
            className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-0 px-4 text-center sm:px-6 lg:px-8"
            variants={stagger} initial="hidden" animate="show"
          >
            <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
              <span className="h-1.5 w-1.5 rounded-full bg-cta animate-pulse" />
              Your Journey to Care
            </motion.span>
            <motion.h1 variants={fadeUp} className="mt-5 section-heading text-4xl text-navy sm:text-5xl md:text-6xl">
              How TelePsych Works
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 text-lg leading-relaxed text-gray-700 sm:text-xl">
              Getting started is simple. Request access to our secure patient portal, complete your profile, and book your first appointment — all online.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-3 text-base font-semibold text-cta">
              Most new patients book their first visit within a few days.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-4">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link href="/request-access" className="btn-primary px-8 py-3.5 text-base">
                  Request Access
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link href="#journey" className="inline-flex items-center rounded-xl border-2 border-cta/40 bg-white/60 px-8 py-3.5 text-base font-semibold text-cta backdrop-blur-sm transition hover:bg-white/80">
                  See how it works
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Care journey ── */}
        <section id="journey" className="bg-[#d6e8d8] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="flex flex-col items-start">
              <motion.span variants={fadeLeft} className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cta" /> Step by Step
              </motion.span>
              <motion.h2 variants={fadeLeft} className="mt-4 section-heading section-heading-accent text-2xl sm:text-3xl">
                Your care journey
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-3 max-w-2xl text-base text-gray-600">
                From your first message to your first visit — here's exactly what to expect.
              </motion.p>
            </motion.div>

            <div className="relative mt-14">
              {/* Animated connector line */}
              <motion.div className="absolute left-[5%] right-[5%] top-[52px] hidden h-px bg-cta/15 lg:block"
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                transition={{ duration: 1.0, ease, delay: 0.1 }} style={{ originX: 0 }} />
              <motion.div className="absolute left-[5%] right-[5%] top-[52px] hidden h-px bg-cta/50 lg:block"
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                transition={{ duration: 1.4, ease, delay: 0.35 }} style={{ originX: 0 }} />

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                {steps.map(({ step, icon: Icon, title, body }, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 48, scale: 0.92 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.15, duration: 0.7, ease }}
                    whileHover={{ y: -10, boxShadow: "0 16px 40px rgba(0,0,0,0.11)", transition: { duration: 0.22 } }}
                    className="group relative flex flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]"
                  >
                    {/* Gradient fill on hover */}
                    <motion.div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cta/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <motion.span
                      className="relative z-10 mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-cta text-sm font-bold text-white shadow-[0_4px_14px_rgba(122,158,132,0.45)]"
                      initial={{ scale: 0, rotate: -15 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.25 + i * 0.15, duration: 0.5, type: "spring", stiffness: 220 }}
                    >
                      {step}
                    </motion.span>

                    <motion.div
                      className="relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cta/10 text-cta"
                      whileHover={{ scale: 1.18, rotate: 6, transition: { duration: 0.2 } }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.6} />
                    </motion.div>

                    <h3 className="relative z-10 font-semibold text-navy">{title}</h3>
                    <p className="relative z-10 mt-2 text-sm leading-relaxed text-gray-600">{body}</p>

                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl bg-gradient-to-r from-cta to-cta/40"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.35 }}
                      style={{ originX: 0 }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Appointment types ── */}
        <section className="bg-[#eef4ec] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="flex flex-col items-start">
              <motion.span variants={fadeLeft} className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cta" /> Visit Types
              </motion.span>
              <motion.h2 variants={fadeLeft} className="mt-4 section-heading section-heading-accent text-2xl sm:text-3xl">
                Appointment types
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-3 max-w-2xl text-base text-gray-600">
                Each appointment is designed for a specific stage of your care.
              </motion.p>
            </motion.div>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {appointmentTypes.map((apt, i) => (
                <motion.div
                  key={apt.title}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.14, duration: 0.7, ease }}
                  whileHover={{ y: -10, transition: { duration: 0.22 } }}
                  className={`group relative overflow-hidden rounded-2xl border p-8 shadow-[0_4px_24px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_10px_40px_rgba(0,0,0,0.10)] ${apt.featured ? "border-cta/30 bg-white ring-2 ring-cta/20" : "border-cream-300 bg-white"}`}
                >
                  {apt.featured && (
                    <span className="absolute right-4 top-4 rounded-full bg-cta px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Most Common
                    </span>
                  )}

                  {/* Gradient bg on hover */}
                  <motion.div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${apt.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <motion.span
                    className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-xl ${apt.iconBg}`}
                    whileHover={{ scale: 1.15, rotate: -6, transition: { duration: 0.2 } }}
                  >
                    {apt.icon}
                  </motion.span>

                  <h3 className="relative z-10 mt-5 text-lg font-semibold text-navy">{apt.title}</h3>

                  <motion.span
                    className="relative z-10 mt-3 inline-block rounded-lg border border-cta/30 bg-cta/10 px-4 py-1.5 text-sm font-bold text-cta"
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.14, duration: 0.4, type: "spring" }}
                  >
                    {apt.duration}
                  </motion.span>

                  <motion.div
                    className="relative z-10 mt-4 h-px w-12 bg-cta/30"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.14, duration: 0.6, ease }}
                    style={{ originX: 0 }}
                  />

                  <p className="relative z-10 mt-4 text-sm leading-relaxed text-gray-700">{apt.desc}</p>
                  <ul className="relative z-10 mt-4 space-y-1.5 text-sm text-gray-600">
                    {apt.bullets.map((b, bi) => (
                      <motion.li
                        key={b}
                        className="flex items-start gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.35 + i * 0.14 + bi * 0.06, duration: 0.4, ease }}
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cta/60" />
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── After your first appointment ── */}
        <section className="bg-[#d6e8d8] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="flex flex-col items-start">
              <motion.span variants={fadeLeft} className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cta" /> What Comes Next
              </motion.span>
              <motion.h2 variants={fadeLeft} className="mt-4 section-heading section-heading-accent text-2xl sm:text-3xl">
                After your first appointment
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-3 max-w-2xl text-base text-gray-600">
                Following your evaluation, your doctor will discuss next steps with you.
              </motion.p>
            </motion.div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {afterVisit.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, scale: 0.88, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.13, duration: 0.6, ease }}
                  whileHover={{ y: -8, boxShadow: `0 12px 32px ${item.glow}`, transition: { duration: 0.22 } }}
                  className="group relative flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04] overflow-hidden"
                >
                  <motion.span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}
                    whileHover={{ scale: 1.2, rotate: 8, transition: { duration: 0.2 } }}
                    initial={{ rotate: -10, scale: 0.7 }}
                    whileInView={{ rotate: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.13, duration: 0.45, type: "spring", stiffness: 180 }}
                  >
                    {item.icon}
                  </motion.span>
                  <h3 className="mt-4 font-semibold text-navy">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.desc}</p>

                  {/* Number badge */}
                  <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400">
                    {i + 1}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Patient portal ── */}
        <section className="relative overflow-hidden bg-[#eef4ec] py-20 sm:py-28">
          <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-cta/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-cta/8 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="flex flex-col items-start">
              <motion.span variants={fadeLeft} className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cta" /> Patient Portal
              </motion.span>
              <motion.h2 variants={fadeLeft} className="mt-4 section-heading section-heading-accent text-2xl sm:text-3xl">
                Your secure patient portal
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-3 max-w-2xl text-base text-gray-600">
                Everything you need to manage your care — in one place, accessible any time.
              </motion.p>
            </motion.div>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {portalFeatures.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 32, rotateX: 8 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.14, duration: 0.7, ease }}
                  whileHover={{ y: -8, transition: { duration: 0.22 } }}
                  className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-[0_2px_16px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]"
                >
                  {/* Top accent bar */}
                  <motion.div
                    className={`absolute top-0 left-0 right-0 h-1 ${f.barColor} rounded-t-2xl`}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.14, duration: 0.7, ease }}
                    style={{ originX: 0 }}
                  />

                  <motion.span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.color}`}
                    whileHover={{ scale: 1.18, rotate: -5, transition: { duration: 0.2 } }}
                    initial={{ scale: 0.7, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.14, duration: 0.5, type: "spring", stiffness: 200 }}
                  >
                    {f.icon}
                  </motion.span>

                  <h3 className="mt-5 font-semibold text-navy">{f.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600">
                    {f.bullets.map((b, bi) => (
                      <motion.li
                        key={b}
                        className="flex items-start gap-2"
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.14 + bi * 0.07, duration: 0.4, ease }}
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cta/60" />
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Secure care + FAQ ── */}
        <section className="bg-[#d6e8d8] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 lg:items-start">

              {/* Left: secure care */}
              <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="flex flex-col items-start">
                <motion.span variants={fadeLeft} className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-cta" /> Privacy & Security
                </motion.span>
                <motion.h2 variants={fadeLeft} className="mt-4 section-heading section-heading-accent text-2xl sm:text-3xl">
                  Secure and private care
                </motion.h2>
                <motion.p variants={fadeUp} className="mt-4 text-base font-semibold text-navy">
                  Protecting your privacy is a top priority.
                </motion.p>
                <motion.p variants={fadeUp} className="mt-3 text-base leading-relaxed text-gray-700">
                  Our platform uses secure, encrypted telehealth technology designed to protect your personal health information and meet healthcare security standards.
                </motion.p>
                <motion.p variants={fadeUp} className="mt-3 text-base leading-relaxed text-gray-700">
                  All appointments take place through secure video visits, allowing families to access care safely from home.
                </motion.p>
                <motion.div variants={stagger} className="mt-8 flex flex-col gap-3">
                  {[
                    { icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.6} />, label: "HIPAA-aware platform" },
                    { icon: <Lock className="h-5 w-5" strokeWidth={1.6} />, label: "Encrypted video visits" },
                    { icon: <FolderOpen className="h-5 w-5" strokeWidth={1.6} />, label: "Secure patient portal" },
                  ].map(({ icon, label }, i) => (
                    <motion.span
                      key={label}
                      variants={fadeLeft}
                      whileHover={{ x: 6, transition: { duration: 0.2 } }}
                      className="inline-flex items-center gap-3 rounded-xl border border-cta/30 bg-white/90 px-5 py-3 text-sm font-medium text-navy shadow-sm cursor-default"
                    >
                      <motion.span
                        className="text-cta"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 220 }}
                      >
                        {icon}
                      </motion.span>
                      {label}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>

              {/* Right: FAQ */}
              <motion.div
                variants={fadeRight}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                className="flex flex-col items-start"
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-cta" /> FAQs
                </span>
                <h2 className="mt-4 section-heading section-heading-accent text-2xl sm:text-3xl">
                  Common questions
                </h2>
                <div className="mt-6">
                  <FaqAccordion
                    items={[
                      { question: "How long does approval take?", answer: "Most access requests are reviewed within 1–2 business days." },
                      { question: "Do I need to install any software for video visits?", answer: "No. Appointments take place through a secure link that works in most modern web browsers." },
                      { question: "Can parents attend appointments?", answer: "Yes. For children and adolescents, a parent or guardian is typically involved in the visit." },
                      { question: "What if I need to reschedule?", answer: "Appointments can be rescheduled directly through the patient portal." },
                    ]}
                  />
                </div>
                <motion.div whileHover={{ x: 4, transition: { duration: 0.2 } }}>
                  <Link href="/faq" className="mt-6 inline-flex items-center gap-1.5 font-medium text-cta hover:underline">
                    View full FAQ
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden bg-[#eef4ec] py-24 sm:py-32">
          <div className="pointer-events-none absolute -top-12 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cta/10 blur-3xl" />

          <motion.div
            className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
          >
            <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
              <span className="h-1.5 w-1.5 rounded-full bg-cta animate-pulse" /> Get Started Today
            </motion.span>
            <motion.h2 variants={fadeUp} className="mt-5 section-heading text-3xl text-navy sm:text-4xl">
              Ready to begin care?
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 text-base text-gray-700 sm:text-lg">
              Getting started takes only a few minutes. Request access to the patient portal and schedule your first visit.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Link href="/request-access" className="btn-primary inline-flex items-center px-8 py-3.5 text-base font-medium">
                  Request Access
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Link href="/login" className="inline-flex items-center rounded-xl border-2 border-cta bg-white px-8 py-3.5 text-base font-medium text-cta transition hover:bg-cream-100">
                  Patient Login
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

      </main>
      <Footer />
    </>
  );
}
