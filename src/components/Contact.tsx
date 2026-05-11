"use client";

import Image from "next/image";
import { useState } from "react";

export default function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(fd)),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setStatus("sent");
        form.reset();
      } else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden py-28 sm:py-36">
      <div className="absolute inset-0 z-0">
        <Image
          src="/contact.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority={false}
        />
        <div className="absolute inset-0 bg-white/35" aria-hidden />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading section-heading-accent text-3xl md:text-4xl">Contact</h2>
        <p className="mt-5 text-gray-600">
          Message us directly by filling out the form below and we will respond promptly.
        </p>
        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1.5 block w-full rounded-xl border border-cream-200/80 bg-white px-4 py-3 text-navy shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/40"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1.5 block w-full rounded-xl border border-cream-200/80 bg-white px-4 py-3 text-navy shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/40"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="mt-1.5 block w-full rounded-xl border border-cream-200/80 bg-white px-4 py-3 text-navy shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/40"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="mt-1.5 block w-full rounded-xl border border-cream-200/80 bg-white px-4 py-3 text-navy shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/40"
              />
            </div>
            <button type="submit" disabled={status === "sending"} className="btn-primary w-full">
              {status === "sending" ? "Sending…" : status === "sent" ? "Sent" : "Submit"}
            </button>
            <p className="text-xs text-gray-500">
              Your message is confidential and HIPAA-compliant.
            </p>
            {status === "error" && (
              <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
            )}
          </form>
          <div>
            <p className="text-sm font-medium text-gray-700">California</p>
            <p className="mt-1 text-gray-600">Services provided via telehealth</p>
            <a href="tel:+18587766267" className="mt-4 inline-flex items-center gap-2 btn-primary">
              Call (858) 776-6267
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
