import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const links = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/#testimonials", label: "Testimonials" },
  { href: "/#contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
  { href: "/request-access", label: "Request Access (New Patients)" },
  { href: "/login", label: "Patient Login" },
  { href: "/doctor/login", label: "Doctor Login" },
  { href: "/reset-password", label: "Reset Password" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/disclaimer", label: "Website Disclaimer" },
];

export default function SitemapPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Sitemap</h1>
          <ul className="mt-6 space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-warm-brown hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
