"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/#testimonials", label: "Testimonials" },
  { href: "/#contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

export default function Header() {
  const pathname = usePathname();
  const [patientCenterOpen, setPatientCenterOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-cream-300/80 bg-cream-100 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 flex-col items-start">
          <span className="text-2xl font-semibold tracking-tight text-warm-brown">TP</span>
          <span className="text-sm font-medium text-gray-600">TelePsych</span>
        </Link>

        <nav className="flex flex-1 items-center justify-center gap-5 sm:gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link text-base font-medium ${
                pathname === link.href ? "text-warm-brown after:w-full" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="relative">
            <button
              onClick={() => setPatientCenterOpen(!patientCenterOpen)}
              className="flex items-center gap-1 text-base font-medium text-gray-700 transition hover:text-warm-brown"
            >
              Book Appointment
              <svg
                className={`h-4 w-4 transition ${patientCenterOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {patientCenterOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setPatientCenterOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-56 animate-fade-in-up rounded-xl border border-cream-200/80 bg-white py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                  <Link
                    href="/request-access"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-cream-100 hover:text-warm-brown"
                    onClick={() => setPatientCenterOpen(false)}
                  >
                    New Patient — Request Access
                  </Link>
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-cream-100 hover:text-warm-brown"
                    onClick={() => setPatientCenterOpen(false)}
                  >
                    Returning Patient — Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <Link href="/#contact" className="text-base font-medium text-gray-700 transition hover:text-warm-brown">
            Contact Us
          </Link>
          <a
            href="tel:+18587766267"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            California
          </a>
        </div>
      </div>
    </header>
  );
}
