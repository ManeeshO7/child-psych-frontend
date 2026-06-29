import Link from "next/link";

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.398.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    name: "Twitter",
    href: "https://twitter.com/",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/#testimonials", label: "Testimonials" },
  { href: "/faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-cream-300/80 bg-header-footer">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">

        {/* Main 3-column grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.6fr] lg:gap-16">

          {/* Col 1: Brand */}
          <div>
            <Link href="/" className="flex flex-col items-start">
              <span className="text-2xl font-semibold tracking-tight text-navy">TP</span>
              <span className="text-sm font-medium text-gray-600">TelePsych</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              Evidence-based psychiatric care for children, adolescents, and young adults — delivered via secure telehealth across California.
            </p>
            <div className="mt-5 flex items-center gap-4">
              {SOCIAL_LINKS.map(({ name, href, icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 transition-colors hover:text-cta"
                  aria-label={name}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Quick Links</p>
            <ul className="mt-4 space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-600 transition-colors hover:text-cta">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contact Info */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Contact</p>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Serving California via Telehealth
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+18587766267" className="transition-colors hover:text-cta">(858) 776-6267</a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                By appointment only
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                HIPAA Compliant &amp; Secure
              </li>
            </ul>
            <Link href="/request-access" className="mt-6 inline-flex items-center gap-2 btn-primary text-sm">
              Request Access
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Divider + copyright */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-cream-300/80 pt-6 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TelePsych. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Terms of Service</span>
          </div>
        </div>

        {/* Disclaimers */}
        <div className="mt-6 rounded-2xl border border-cream-300/60 bg-white/30 px-6 pb-5 pt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-cream-300/80" />
            <p className="text-[10px] font-bold uppercase leading-5 tracking-[0.2em] text-gray-400">
              California Telepsychiatry Disclaimers — Child &amp; Adolescent Care
            </p>
            <div className="h-px flex-1 bg-cream-300/80" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              { title: "Patient Location Requirement", text: "Psychiatric services are provided via telehealth only to patients physically located in the state of California at the time of the appointment." },
              { title: "Parental Consent & Participation", text: "For minors, parental or legal guardian consent is required prior to initiating treatment. Parent participation may be included as clinically appropriate." },
              { title: "Emergency Care", text: "Telepsychiatry is not suitable for emergencies. Call 911, go to the nearest emergency room, or contact the 988 Suicide & Crisis Lifeline." },
              { title: "Telehealth Consent", text: "By scheduling an appointment, you acknowledge and consent to telepsychiatry services in accordance with California law." },
            ] as const).map((item) => (
              <div key={item.title} className="flex gap-2.5">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cta/60" />
                <div>
                  <p className="text-xs font-semibold text-gray-600">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
