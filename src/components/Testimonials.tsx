"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const testimonials = [
  {
    quote:
      "Received such amazing therapeutic and pharmacological help. Recommend to everyone who is looking for individualized psychiatric care.",
  },
  {
    quote:
      "After struggling to find a good fit with other psychiatrists, I knew from the first session that this was the one. Professional and kind—I can confidently say they've helped our family thrive.",
  },
  {
    quote:
      "A thorough history and a great treatment plan. I am healthier, happier and excited about my future.",
  },
  {
    quote:
      "The telehealth experience was seamless. I felt heard and supported from day one. My mental health has improved significantly.",
  },
  {
    quote:
      "Finally, a psychiatrist who takes time to explain everything. The combination of therapy and medication management has been life-changing.",
  },
  {
    quote:
      "Professional, compassionate, and responsive. I recommend TelePsych to anyone seeking quality psychiatric care from the comfort of home.",
  },
];

const SLIDE_COUNT = 3; // 3 slides, each showing 2 of 6 testimonials
const ROTATE_INTERVAL_MS = 5000;

const testimonialImage =
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&h=400&fit=crop";

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
    <section id="testimonials" className="relative overflow-hidden py-28 sm:py-36">
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
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-2 text-center text-sm font-medium uppercase tracking-wider text-warm-brown/90">
          Trusted by families across California
        </p>
        <div className="grid gap-6 md:grid-cols-[1fr_1.15fr_1fr] md:items-stretch lg:gap-8">
          {/* Left card */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <div className="absolute inset-0 z-0">
              <Image
                src="/5.jpeg"
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-cream-200/90" aria-hidden />
            </div>
            <div className="relative z-10 flex flex-1 flex-col p-6 md:p-8">
              <span className="text-5xl font-serif leading-none text-gray-400" style={{ fontFamily: "Georgia, serif" }}>
                &ldquo;
              </span>
              <p className="mt-4 flex-1 font-serif text-[17px] leading-relaxed text-gray-800" style={{ fontFamily: "Georgia, serif" }}>
                {testimonials[leftIndex].quote}
              </p>
              <div className="mt-6 flex gap-2">
                {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 w-8 rounded-full ${i === slideIndex ? "bg-warm-brown" : "bg-gray-300"}`}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Middle card */}
          <div className="relative flex min-h-[320px] flex-col overflow-hidden rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] md:min-h-[380px]">
            <div className="absolute inset-0 z-0">
              <Image
                src={testimonialImage}
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-black/30" aria-hidden />
            </div>
            <div className="relative z-10 flex flex-1 items-center justify-center p-8">
              <h2 className="text-center text-xl font-bold uppercase tracking-wide text-white drop-shadow-md md:text-2xl">
                Testimonials
              </h2>
            </div>
          </div>

          {/* Right card */}
          <div className="relative flex flex-col overflow-hidden rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <div className="absolute inset-0 z-0">
              <Image
                src="/5.jpeg"
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-cream-200/90" aria-hidden />
            </div>
            <div className="relative z-10 flex flex-1 flex-col p-6 md:p-8">
              <span className="text-5xl font-serif leading-none text-gray-400" style={{ fontFamily: "Georgia, serif" }}>
                &ldquo;
              </span>
              <p className="mt-4 flex-1 font-serif text-[17px] leading-relaxed text-gray-800" style={{ fontFamily: "Georgia, serif" }}>
                {testimonials[rightIndex].quote}
              </p>
              <div className="mt-6 flex gap-2">
                {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 w-8 rounded-full ${i === slideIndex ? "bg-warm-brown" : "bg-gray-300"}`}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
