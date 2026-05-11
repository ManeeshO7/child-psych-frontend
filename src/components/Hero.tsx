import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden sm:min-h-screen">
      <div className="absolute inset-0 z-0">
        <Image
          src="/landingpage.png"
          alt=""
          fill
          className="object-cover object-[85%_50%] sm:object-[80%_50%] lg:object-center"
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
        />
        <div className="absolute inset-0 bg-black/15 sm:bg-white/15" aria-hidden />
        {/* Fade into next section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream-100 to-transparent"
          aria-hidden
        />
      </div>
      <div className="relative z-10 flex min-h-[100dvh] w-full items-center px-5 py-8 sm:min-h-screen sm:pl-12 sm:pr-6 sm:py-10 md:pl-16 md:pr-8 lg:pl-32 lg:pr-8">
        <div className="w-full max-w-lg text-left animate-fade-in-up">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-sm sm:text-cta sm:drop-shadow-sm md:text-base">
            Online Psychiatric Care
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-5xl sm:leading-[1.1] sm:text-navy sm:drop-shadow-sm md:text-6xl lg:text-7xl">
            Personalizing Your Journey to Peak Mental Health
          </h1>
          <p className="mt-3 text-base leading-snug text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-lg sm:text-gray-700 sm:drop-shadow-sm md:text-xl">
            Evidence-based psychiatric care through secure telepsychiatry for children, adolescents, and young adults in California.
          </p>
        </div>
      </div>
    </section>
  );
}
