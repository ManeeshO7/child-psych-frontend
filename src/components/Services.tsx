'use client';

import Image from "next/image";
import Link from "next/link";
import { useInView } from "@/hooks/useInView";

type Service = {
  title: string;
  description: string;
  image: string;
  alt: string;
};

const services: Service[] = [
  {
    title: "Psychiatric Evaluation",
    description:
      "Comprehensive initial evaluations for children and adolescents, including parent sessions. We take time to understand your history, concerns, and goals to create a clear path forward.",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&h=380&fit=crop",
    alt: "Professional consultation",
  },
  {
    title: "Psychotherapy",
    description:
      "Evidence-based therapy tailored to support emotional well-being and development. Individual and family sessions in a safe, supportive environment to build lasting change.",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&h=380&fit=crop",
    alt: "Calm and wellness",
  },
  {
    title: "Medication Management",
    description:
      "Thoughtful medication assessment and ongoing management when clinically indicated. We work with you to find the right balance and monitor progress over time.",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&h=380&fit=crop",
    alt: "Medication and care",
  },
  {
    title: "Follow-up Care",
    description:
      "Ongoing support and monitoring to build long-term resilience. Regular check-ins and continuity of care so you and your family can thrive.",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=380&fit=crop",
    alt: "Ongoing support and care",
  },
];

function IntroCard() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl bg-[#d4c4a8] p-8 text-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-700 ease-out will-change-transform ${
        inView
          ? "translate-x-0 translate-y-0 scale-100 opacity-100 blur-0"
          : "-translate-x-8 translate-y-6 scale-[0.96] opacity-0 blur-[2px]"
      }`}
    >
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Featured Services
      </h2>
      <p className="mt-2 text-base font-medium opacity-90 sm:text-lg">
        What We Offer
      </p>
      <p className="mt-4 text-sm leading-relaxed opacity-90">
        Personalized psychiatric care for children, adolescents, and young adults—evaluation, therapy, medication management, and ongoing support.
      </p>
      <div className="mt-auto pt-8">
        <Link
          href="/#services"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-warm-brown shadow transition hover:bg-white"
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
  const initialOffsetX = index % 2 === 0 ? "translate-x-8" : "-translate-x-8";

  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${120 + index * 90}ms` : "0ms" }}
      className={`group flex min-h-[420px] flex-col overflow-hidden rounded-2xl bg-cream-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-700 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${
        inView
          ? "translate-x-0 translate-y-0 scale-100 opacity-100 blur-0"
          : `${initialOffsetX} translate-y-6 scale-[0.96] opacity-0 blur-[2px]`
      }`}
    >
      <div className="relative aspect-[4/3] min-h-[220px] overflow-hidden bg-gray-100">
        <Image
          src={service.image}
          alt={service.alt}
          fill
          className="object-cover transition group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 22vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <h3 className="absolute bottom-0 left-0 right-0 p-5 text-xl font-semibold text-white drop-shadow-sm sm:text-2xl">
          {service.title}
        </h3>
      </div>
      <p className="flex-1 p-5 text-base leading-relaxed text-gray-600">
        {service.description}
      </p>
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
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading section-heading-accent mb-12 text-3xl md:mb-16 md:text-4xl">Services</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <IntroCard />
          {services.map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
