"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    quote: "Received such amazing therapeutic and pharmacological help after struggling for so many years. I finally feel like my concerns are taken seriously, and every option is explained in a way that makes sense.",
    detail: "The sessions are structured but never rushed, and I always leave with clear next steps. I recommend TelePsych to anyone looking for individualized psychiatric care.",
  },
  {
    quote: "After struggling to find a good fit with other psychiatrists, I knew from the first session that this was the one. The care is professional, kind, and truly collaborative—nothing feels rushed.",
    detail: "We feel listened to, and the plan is adjusted thoughtfully as life changes. I can confidently say this support has helped our family feel calmer, more connected, and hopeful again.",
  },
  {
    quote: "A thorough history and a thoughtful treatment plan that actually feels tailored to me. The follow-ups are consistent, and communication is prompt when questions come up.",
    detail: "I appreciated how clearly everything was explained and how my preferences were respected. I feel healthier, happier, and genuinely excited about my future.",
  },
  {
    quote: "The telehealth experience was seamless and easy to schedule, which mattered a lot with a busy family routine. I felt heard and supported from day one, and the approach has been practical and compassionate.",
    detail: "Appointments start on time and the care feels consistent even through telehealth. My mental health has improved significantly, and I feel more stable week to week.",
  },
  {
    quote: "Finally, a psychiatrist who takes the time to explain everything—benefits, risks, and what to expect next. I never feel judged, and I always leave with a clear plan.",
    detail: "Small changes were made carefully, and I felt supported at every step. The combination of therapy support and medication management has been life-changing for me.",
  },
  {
    quote: "Professional, compassionate, and responsive. Messages are answered quickly, and the process feels organized without being impersonal.",
    detail: "It's rare to find care that's both efficient and genuinely human. I recommend TelePsych to anyone seeking quality psychiatric care from the comfort of home.",
  },
];

const SLIDE_COUNT = 3;
const ROTATE_INTERVAL_MS = 3500;

const slideVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export default function Testimonials() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: false, margin: "-80px" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(
      () => setSlideIndex((p) => (p + 1) % SLIDE_COUNT),
      ROTATE_INTERVAL_MS
    );
  };

  useEffect(() => {
    if (!inView || paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [inView, paused]);

  const leftIndex = slideIndex * 2;
  const rightIndex = slideIndex * 2 + 1;

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="relative overflow-hidden py-14 sm:py-20 lg:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 -z-10">
        <Image src="/testimonials-bg.png" alt="" fill className="object-cover object-center" sizes="100vw" priority={false} />
        <div className="absolute inset-0 bg-white/45" aria-hidden />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center text-xl font-bold tracking-[0.22em] text-cta sm:text-2xl"
        >
          TESTIMONIALS
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
          className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:gap-6 md:grid-cols-[1fr_1.15fr_1fr] md:items-stretch lg:gap-8"
        >
          {/* Left quote */}
          <div className="order-2 relative col-span-1 flex flex-col overflow-hidden rounded-3xl bg-cream-50 p-5 pt-9 shadow-[0_18px_60px_rgba(0,0,0,0.10)] ring-1 ring-cream-300/80 sm:p-8 sm:pt-10 md:order-none">
            <div className="pointer-events-none absolute left-5 top-4 z-0 select-none font-serif text-[64px] leading-none text-gray-300/90 sm:left-7 sm:top-5 sm:text-[88px]" aria-hidden>
              &ldquo;
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={leftIndex}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="relative z-10 mt-1 flex flex-1 flex-col justify-center text-left font-serif text-[13px] leading-relaxed text-gray-700 sm:mt-2 sm:text-[15px] md:text-[16px]"
              >
                <p className="max-w-[40ch]">{testimonials[leftIndex].quote}</p>
                <p className="mt-3 max-w-[40ch] text-gray-600">{testimonials[leftIndex].detail}</p>
              </motion.div>
            </AnimatePresence>
            <Dots slideIndex={slideIndex} setSlideIndex={setSlideIndex} />
          </div>

          {/* Center image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="order-1 relative col-span-2 w-full max-w-[380px] justify-self-center overflow-hidden rounded-3xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.10)] ring-1 ring-black/5 md:order-none md:col-span-1 md:max-w-none"
          >
            <div className="relative aspect-[4/5] w-full md:aspect-[3/4]">
              <Image
                src="/testimonials-center-v2.png"
                alt="Happy patients"
                fill
                className="object-cover object-[50%_75%] sm:object-[50%_80%] md:object-[50%_85%]"
                sizes="(max-width: 768px) 380px, 40vw"
                priority={false}
              />
              {/* Top gradient + TESTIMONIALS label */}
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 top-0 flex flex-col items-center px-4 pt-7 text-center">
                <p className="text-xl font-bold uppercase tracking-[0.25em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:text-2xl">Testimonials</p>
                <div className="mt-2 h-px w-12 bg-white/60" />
              </div>
            </div>
          </motion.div>

          {/* Right quote */}
          <div className="order-3 relative col-span-1 flex flex-col overflow-hidden rounded-3xl bg-cream-50 p-5 pt-9 shadow-[0_18px_60px_rgba(0,0,0,0.10)] ring-1 ring-cream-300/80 sm:p-8 sm:pt-10 md:order-none">
            <div className="pointer-events-none absolute left-5 top-4 z-0 select-none font-serif text-[64px] leading-none text-gray-300/90 sm:left-7 sm:top-5 sm:text-[88px]" aria-hidden>
              &ldquo;
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={rightIndex}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="relative z-10 mt-1 flex flex-1 flex-col justify-center text-left font-serif text-[13px] leading-relaxed text-gray-700 sm:mt-2 sm:text-[15px] md:text-[16px]"
              >
                <p className="max-w-[40ch]">{testimonials[rightIndex].quote}</p>
                <p className="mt-3 max-w-[40ch] text-gray-600">{testimonials[rightIndex].detail}</p>
              </motion.div>
            </AnimatePresence>
            <Dots slideIndex={slideIndex} setSlideIndex={setSlideIndex} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Dots({ slideIndex, setSlideIndex }: { slideIndex: number; setSlideIndex: (i: number) => void }) {
  return (
    <div className="mt-5 flex items-center justify-center gap-1.5 sm:mt-6 sm:gap-2">
      {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setSlideIndex(i)}
          aria-label={`Go to slide ${i + 1}`}
          className="group p-1"
        >
          <motion.span
            animate={{ width: i === slideIndex ? 36 : 24, opacity: i === slideIndex ? 1 : 0.4 }}
            transition={{ duration: 0.3 }}
            className={`block h-1 rounded-full ${i === slideIndex ? "bg-cta" : "bg-gray-300"}`}
            style={{ width: i === slideIndex ? 36 : 24 }}
          />
        </button>
      ))}
    </div>
  );
}
