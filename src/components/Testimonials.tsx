"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const testimonials = [
  {
    quote:
      "Received such amazing therapeutic and pharmacological help after struggling for so many years. I finally feel like my concerns are taken seriously, and every option is explained in a way that makes sense.",
    detail:
      "The sessions are structured but never rushed, and I always leave with clear next steps. I recommend TelePsych to anyone looking for individualized psychiatric care.",
  },
  {
    quote:
      "After struggling to find a good fit with other psychiatrists, I knew from the first session that this was the one. The care is professional, kind, and truly collaborative—nothing feels rushed.",
    detail:
      "We feel listened to, and the plan is adjusted thoughtfully as life changes. I can confidently say this support has helped our family feel calmer, more connected, and hopeful again.",
  },
  {
    quote:
      "A thorough history and a thoughtful treatment plan that actually feels tailored to me. The follow-ups are consistent, and communication is prompt when questions come up.",
    detail:
      "I appreciated how clearly everything was explained and how my preferences were respected. I feel healthier, happier, and genuinely excited about my future.",
  },
  {
    quote:
      "The telehealth experience was seamless and easy to schedule, which mattered a lot with a busy family routine. I felt heard and supported from day one, and the approach has been practical and compassionate.",
    detail:
      "Appointments start on time and the care feels consistent even through telehealth. My mental health has improved significantly, and I feel more stable week to week.",
  },
  {
    quote:
      "Finally, a psychiatrist who takes the time to explain everything—benefits, risks, and what to expect next. I never feel judged, and I always leave with a clear plan.",
    detail:
      "Small changes were made carefully, and I felt supported at every step. The combination of therapy support and medication management has been life-changing for me.",
  },
  {
    quote:
      "Professional, compassionate, and responsive. Messages are answered quickly, and the process feels organized without being impersonal.",
    detail:
      "It’s rare to find care that’s both efficient and genuinely human. I recommend TelePsych to anyone seeking quality psychiatric care from the comfort of home.",
  },
];

const SLIDE_COUNT = 3; // 3 slides, each showing 2 of 6 testimonials
const ROTATE_INTERVAL_MS = 3000;

const testimonialImage = "/testimonials.png";

export default function Testimonials() {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDE_COUNT);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const leftIndex = slideIndex * 2;
  const rightIndex = slideIndex * 2 + 1;

  return (
    <section id="testimonials" className="relative overflow-hidden py-14 sm:py-20 lg:py-28">
      <div className="absolute inset-0 -z-10">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-sm font-semibold tracking-[0.22em] text-cta/80">
          TESTIMONIALS
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:gap-6 md:grid-cols-[1fr_1.15fr_1fr] md:items-stretch lg:gap-8">
          {/* Left quote card */}
            <div className="order-1 relative col-span-1 flex flex-col rounded-3xl bg-cream-100/95 p-5 pt-9 shadow-[0_18px_60px_rgba(0,0,0,0.10)] ring-1 ring-cream-300/80 backdrop-blur-sm sm:p-8 sm:pt-10 md:order-none">
              <div
                className="pointer-events-none absolute left-5 top-4 z-0 select-none font-serif text-[64px] leading-none text-gray-300/90 sm:left-7 sm:top-5 sm:text-[88px]"
                aria-hidden
              >
                &ldquo;
              </div>
              <div className="relative z-10 mt-1 flex flex-1 flex-col justify-center text-left font-serif text-[13px] leading-relaxed text-gray-700 sm:mt-2 sm:text-[15px] md:text-[16px]">
                <p className="max-w-[40ch]">{testimonials[leftIndex].quote}</p>
                <p className="mt-3 max-w-[40ch] text-gray-600">{testimonials[leftIndex].detail}</p>
            </div>
              <div className="mt-5 flex items-center justify-center gap-1.5 sm:mt-6 sm:gap-2">
              {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-6 rounded-full sm:w-9 ${i === slideIndex ? "bg-cta" : "bg-gray-200"}`}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          {/* Middle image card */}
          <div className="order-3 relative col-span-2 w-full max-w-[380px] justify-self-center overflow-hidden rounded-3xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.10)] ring-1 ring-black/5 md:order-none md:col-span-1 md:max-w-none">
            <div className="relative aspect-[4/5] w-full md:aspect-[3/4]">
              <Image
                src={testimonialImage}
                alt="Happy patients"
                fill
                className="object-cover object-[50%_12%] sm:object-[50%_18%] md:object-[50%_22%] lg:object-center"
                sizes="(max-width: 768px) 380px, 40vw"
                priority={false}
              />
            </div>
          </div>

          {/* Right quote card */}
          <div className="order-2 relative col-span-1 flex flex-col rounded-3xl bg-cream-100/95 p-5 pt-9 shadow-[0_18px_60px_rgba(0,0,0,0.10)] ring-1 ring-cream-300/80 backdrop-blur-sm sm:p-8 sm:pt-10 md:order-none">
            <div
              className="pointer-events-none absolute left-5 top-4 z-0 select-none font-serif text-[64px] leading-none text-gray-300/90 sm:left-7 sm:top-5 sm:text-[88px]"
              aria-hidden
            >
              &ldquo;
            </div>
            <div className="relative z-10 mt-1 flex flex-1 flex-col justify-center text-left font-serif text-[13px] leading-relaxed text-gray-700 sm:mt-2 sm:text-[15px] md:text-[16px]">
              <p className="max-w-[40ch]">{testimonials[rightIndex].quote}</p>
              <p className="mt-3 max-w-[40ch] text-gray-600">{testimonials[rightIndex].detail}</p>
            </div>
            <div className="mt-5 flex items-center justify-center gap-1.5 sm:mt-6 sm:gap-2">
              {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-6 rounded-full sm:w-9 ${i === slideIndex ? "bg-cta" : "bg-gray-200"}`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
