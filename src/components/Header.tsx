"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import LogoutButton from "@/components/LogoutButton";
import DoctorLogoutButton from "@/components/DoctorLogoutButton";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#services", label: "Services" },
  { href: "/#testimonials", label: "Testimonials" },
  { href: "/#contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

function closeMenu() {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}

export default function Header() {
  const pathname = usePathname();
  const [patientCenterOpen, setPatientCenterOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change (e.g. after clicking a link)
  useEffect(() => {
    setMobileMenuOpen(false);
    closeMenu();
  }, [pathname]);

  const openMobileMenu = () => {
    setMobileMenuOpen(true);
    if (typeof document !== "undefined") document.body.style.overflow = "hidden";
  };
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setPatientCenterOpen(false);
    closeMenu();
  };

  const isPortal = pathname?.startsWith("/patient") || pathname?.startsWith("/doctor");
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const headerBg = isHome
    ? scrolled
      ? "bg-header-footer/95 backdrop-blur-md border-b border-cream-300/80 shadow-sm"
      : "bg-transparent border-b border-white/10"
    : "bg-header-footer border-b border-cream-300/80";

  const logoColor = isHome && !scrolled ? "text-navy" : "text-cta";
  const logoSubColor = isHome && !scrolled ? "text-navy/70" : "text-gray-600";
  const navLinkColor = isHome && !scrolled ? "!text-navy hover:!text-cta" : "";

  const desktopNav = (
    <>
      <nav className="hidden flex-1 items-center justify-center gap-5 sm:gap-6 lg:flex">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link text-base font-medium transition-colors duration-300 ${navLinkColor} ${
              pathname === link.href ? "text-cta-hover after:w-full" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
        <div className="relative">
          <button
            onClick={() => setPatientCenterOpen(!patientCenterOpen)}
            className={`flex items-center gap-1 text-base font-medium transition-colors duration-300 hover:text-cta-hover ${isHome && !scrolled ? "text-navy" : "text-navy"}`}
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
                  className="block px-4 py-2 text-sm text-navy hover:bg-cream-100 hover:text-cta"
                  onClick={() => setPatientCenterOpen(false)}
                >
                  New Patient — Request Access
                </Link>
                <Link
                  href="/login"
                  className="block px-4 py-2 text-sm text-navy hover:bg-cream-100 hover:text-cta"
                  onClick={() => setPatientCenterOpen(false)}
                >
                  Returning Patient — Login
                </Link>
              </div>
            </>
          )}
        </div>
      </nav>

      <div className="hidden shrink-0 items-center gap-4 lg:flex">
        {pathname?.startsWith("/patient") ? (
          <LogoutButton />
        ) : pathname?.startsWith("/doctor") ? (
          <>
            <DoctorLogoutButton />
          </>
        ) : (
          <>
            <Link href="/#contact" className={`nav-link text-base font-medium transition-colors duration-300 ${navLinkColor}`}>
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
          </>
        )}
      </div>
    </>
  );

  return (
    <header className={`site-header ${isHome ? "fixed" : "sticky"} top-0 z-50 w-full transition-all duration-300 ${headerBg}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-24 lg:gap-6 lg:px-8">
        <Link href="/" className="flex shrink-0 flex-col items-start">
          <span className={`text-xl font-semibold tracking-tight sm:text-2xl transition-colors duration-300 ${logoColor}`}>TP</span>
          <span className={`text-xs font-medium sm:text-sm transition-colors duration-300 ${logoSubColor}`}>TelePsych</span>
        </Link>

        {desktopNav}

        {/* Mobile menu button — visible below lg */}
        <button
          type="button"
          onClick={mobileMenuOpen ? closeMobileMenu : openMobileMenu}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition hover:bg-cream-200/80 hover:text-cta lg:hidden ${isHome && !scrolled ? "text-navy" : "text-navy"}`}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu: render in portal so it's not clipped by parent overflow/transform */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden ${
                mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!mobileMenuOpen}
              onClick={closeMobileMenu}
            />
            <div
              className={`fixed right-0 top-0 z-50 flex h-full w-[min(320px,85vw)] max-w-sm flex-col border-l border-cream-300/80 bg-header-footer shadow-xl transition-transform duration-200 ease-out lg:hidden ${
                mobileMenuOpen ? "translate-x-0" : "translate-x-full"
              }`}
              aria-modal="true"
              aria-label="Main menu"
              role="dialog"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-cream-300/80 px-4 py-4">
                <span className="text-lg font-semibold text-cta">Menu</span>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-navy hover:bg-cream-200/80 hover:text-cta"
                  aria-label="Close menu"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto overscroll-contain" style={{ height: "calc(100vh - 4rem)", minHeight: "200px" }}>
                <nav className="flex flex-col py-3 pb-6" aria-label="Main navigation">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block px-5 py-3.5 text-base font-medium ${
                        pathname === link.href ? "bg-cream-200/60 text-cta" : "text-navy hover:bg-cream-200/40"
                      }`}
                      onClick={closeMobileMenu}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t border-cream-300/80 px-5 py-2">
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Book Appointment
                    </p>
                    <Link
                      href="/request-access"
                      className="block rounded-lg px-3 py-3 text-base text-navy hover:bg-cream-200/60 hover:text-cta"
                      onClick={closeMobileMenu}
                    >
                      New Patient — Request Access
                    </Link>
                    <Link
                      href="/login"
                      className="block rounded-lg px-3 py-3 text-base text-navy hover:bg-cream-200/60 hover:text-cta"
                      onClick={closeMobileMenu}
                    >
                      Returning Patient — Login
                    </Link>
                  </div>
                  {!isPortal && (
                    <>
                      <div className="border-t border-cream-300/80" />
                      <Link
                        href="/#contact"
                        className="block px-5 py-3.5 text-base font-medium text-navy hover:bg-cream-200/40"
                        onClick={closeMobileMenu}
                      >
                        Contact Us
                      </Link>
                      <a
                        href="tel:+18587766267"
                        className="mx-4 mt-2 flex items-center justify-center gap-2 rounded-lg bg-cta px-4 py-3 text-sm font-medium text-white transition hover:bg-cta-hover"
                        onClick={closeMobileMenu}
                      >
                        <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        Call California
                      </a>
                    </>
                  )}
                  {pathname?.startsWith("/patient") && (
                    <div className="border-t border-cream-300/80 px-5 py-3">
                      <LogoutButton />
                    </div>
                  )}
                  {pathname?.startsWith("/doctor") && (
                    <div className="border-t border-cream-300/80 px-5 py-3">
                      <DoctorLogoutButton />
                    </div>
                  )}
                </nav>
              </div>
            </div>
          </>,
          document.body
        )}
    </header>
  );
}
