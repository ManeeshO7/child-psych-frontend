import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/landingpage.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-white/15" aria-hidden />
        {/* Fade into next section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream-50 to-transparent"
          aria-hidden
        />
      </div>
      <div className="relative z-10 flex h-full w-full items-center pl-12 pr-4 sm:pl-20 sm:pr-6 lg:pl-32 lg:pr-8">
        <div className="w-full max-w-lg text-left animate-fade-in-up">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-warm-brown drop-shadow-sm sm:text-base">
            Online Psychiatric Care
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-gray-900 drop-shadow-sm sm:text-5xl md:text-6xl lg:text-7xl">
            Personalizing Your Journey to Peak Mental Health
          </h1>
          <p className="mt-3 text-lg leading-snug text-gray-700 drop-shadow-sm sm:text-xl">
            Evidence-based psychiatric care through secure telepsychiatry for children, adolescents, and young adults in California.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/request-access" className="btn-primary">
              Request Access (New Patients)
            </Link>
            <Link href="/login" className="btn-secondary">
              Patient Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
