import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-cream-300/80 bg-cream-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} TelePsych. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/accessibility" className="text-sm text-gray-600 transition-colors hover:text-warm-brown">
              Accessibility
            </Link>
            <Link href="/privacy" className="text-sm text-gray-600 transition-colors hover:text-warm-brown">
              Privacy Policy
            </Link>
            <Link href="/disclaimer" className="text-sm text-gray-600 transition-colors hover:text-warm-brown">
              Website Disclaimer
            </Link>
            <Link href="/sitemap" className="text-sm text-gray-600 transition-colors hover:text-warm-brown">
              Sitemap
            </Link>
          </div>
        </div>
        <div className="mt-6 border-t border-cream-300/80 pt-6">
          <p className="text-xs text-gray-500">
            Psychiatric services are provided via telehealth only to patients physically located in the state of California at the time of the appointment. For minors, parental or legal guardian consent is required. Telepsychiatry is not suitable for emergencies—call 911 or contact the 988 Suicide & Crisis Lifeline in an emergency.
          </p>
        </div>
      </div>
    </footer>
  );
}
