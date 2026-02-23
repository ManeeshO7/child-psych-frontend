import Image from "next/image";
import Link from "next/link";

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden py-28 sm:py-36">
      {/* Background image for the whole section */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/12.jpeg"
          alt="Calming background representing TelePsych care"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        {/* Softer overlay so the background is more visible */}
        <div className="absolute inset-0 bg-white/55" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col justify-center">
            <h2 className="section-heading section-heading-accent text-3xl md:text-4xl">About TelePsych</h2>
            <p className="mt-8 text-base leading-relaxed text-gray-700">
              I provide personalized, evidence-based psychiatric care through secure telepsychiatry for children and adolescents, located in California. My practice offers a thoughtful, concierge-level approach that integrates psychiatric expertise, psychotherapy, and practical life strategies to support emotional well-being, development, and long-term resilience.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              All services are delivered virtually, allowing for discreet, flexible, and high-quality care while maintaining the same clinical standards as in-person psychiatry.
            </p>
            <Link href="/request-access" className="mt-8 inline-block w-fit btn-primary">
              Learn More & Request Access
            </Link>
          </div>
          <div className="flex items-center justify-center rounded-2xl bg-white/40 p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] backdrop-blur-md">
            <div className="aspect-square w-full max-w-sm rounded-xl bg-gradient-to-br from-warm-sand/50 to-cream-200/80" />
          </div>
        </div>
      </div>
    </section>
  );
}
