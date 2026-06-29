import Image from "next/image";

export default function Disclaimers() {
  const items = [
    {
      title: "Patient Location Requirement",
      text: "Psychiatric services are provided via telehealth only to patients physically located in the state of California at the time of the appointment.",
    },
    {
      title: "Parental Consent & Participation",
      text: "For minors, parental or legal guardian consent is required prior to initiating treatment. Parent participation may be included as clinically appropriate.",
    },
    {
      title: "Emergency Care",
      text: "Telepsychiatry is not suitable for emergencies. In the event of a psychiatric emergency, call 911, go to the nearest emergency room, or contact the 988 Suicide & Crisis Lifeline.",
    },
    {
      title: "Telehealth Consent",
      text: "By scheduling an appointment, you acknowledge and consent to telepsychiatry services in accordance with California law, including an understanding of potential benefits and limitations.",
    },
  ];

  return (
    <section className="relative overflow-hidden border-t border-cream-200/70 py-24 sm:py-28">
      <div className="absolute inset-0 z-0">
        <Image
          src="/disclaimers-bg.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority={false}
        />
        <div className="absolute inset-0 bg-white/55" aria-hidden />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="section-heading section-heading-accent mx-auto inline-block text-3xl md:text-4xl after:left-1/2 after:-translate-x-1/2">
            California Telepsychiatry Disclaimers
          </h2>
          <h3 className="mt-4 text-2xl font-semibold text-cta md:text-3xl">
            Child & Adolescent Care
          </h3>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.title} className="rounded-2xl bg-white/90 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
              <h3 className="font-semibold text-cta">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
