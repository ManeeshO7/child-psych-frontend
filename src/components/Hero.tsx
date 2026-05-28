"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.3 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease } },
};

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden sm:min-h-screen">

      {/* ── Layer 1: video background ────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover object-right"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          <Image src="/hero-image.png" alt="" fill className="object-cover object-right" priority sizes="100vw" />
        </video>
      </div>

      {/* ── Layer 2: overlays ────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/10 sm:from-black/35 sm:via-black/15 sm:to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-cream-100 via-cream-100/60 to-transparent" />
      </div>

      {/* ── Layer 4: content ──────────────────────────────── */}
      <div className="relative z-10 flex min-h-[100dvh] w-full items-center px-5 py-8 sm:min-h-screen sm:pl-12 sm:pr-6 sm:py-10 md:pl-16 md:pr-8 lg:pl-24 lg:pr-8">
        <motion.div
          className="w-full max-w-xl text-left"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={item}
            className="text-xs font-medium uppercase tracking-[0.2em] text-white/80 sm:text-navy/80 sm:text-sm md:text-base"
          >
            Online Psychiatric Care
          </motion.p>

          <motion.h1
            variants={item}
            className="mt-2 text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-white sm:text-navy sm:text-5xl sm:leading-[1.1] md:text-6xl lg:text-7xl"
          >
            Personalizing Your Journey to Peak Mental Health
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-3 text-base leading-snug text-white/80 sm:text-navy/80 sm:text-lg md:text-xl"
          >
            Evidence-based psychiatric care through secure telepsychiatry for children, adolescents, and young adults in California.
          </motion.p>

          <motion.div variants={item} className="mt-7 flex flex-wrap gap-3">
            <Link href="/request-access" className="btn-primary shadow-[0_4px_20px_rgba(127,175,192,0.45)]">
              Request Access
            </Link>
            <button
              onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center justify-center rounded-xl border border-navy/30 bg-white/30 px-6 py-3.5 text-sm font-semibold text-navy backdrop-blur-sm transition hover:bg-white/50"
            >
              Learn More
            </button>
          </motion.div>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            {["Board Certified", "HIPAA Secure", "California Licensed"].map((label) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full bg-white/40 px-3 py-1.5 text-xs font-medium text-navy backdrop-blur-sm ring-1 ring-navy/20"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cta text-[10px] font-bold text-white">✓</span>
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

    </section>
  );
}
