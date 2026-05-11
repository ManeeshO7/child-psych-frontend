"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const US_PHONE_DIGITS = 10;

export default function RequestAccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, US_PHONE_DIGITS);
    setPhoneDigits(digits);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const digits = phoneDigits.replace(/\D/g, "").slice(0, US_PHONE_DIGITS);
    if (digits.length !== US_PHONE_DIGITS) {
      setErrorMessage("Please enter a valid 10-digit US phone number.");
      return;
    }
    setStatus("submitting");
    const data = {
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      email: fd.get("email") as string,
      phone: "1" + digits,
      notes: (fd.get("notes") as string) || "",
    };
    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.detail || json.error || "Something went wrong");
        setStatus("error");
        return;
      }
      const requestId = json.requestId;
      if (requestId) {
        router.push(`/request-access/consent?requestId=${encodeURIComponent(requestId)}`);
        return;
      }
      setStatus("error");
      setErrorMessage("Invalid response from server.");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">New Patient — Request Access</h1>
          <p className="mt-2 text-gray-600">
            Fill out the form below. We will review your request and contact you with next steps.
          </p>

          <form onSubmit={handleSubmit} className="card mt-10 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-navy shadow-sm focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-navy shadow-sm focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-navy shadow-sm focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <div className="mt-1 flex rounded-lg border border-cream-200 bg-white shadow-sm focus-within:border-cta focus-within:ring-1 focus-within:ring-cta">
                  <span className="inline-flex items-center rounded-l-lg border-r border-cream-200 bg-gray-50 px-3 text-gray-600">+1</span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="5551234567"
                    maxLength={US_PHONE_DIGITS}
                    value={phoneDigits}
                    onChange={handlePhoneChange}
                    className="block w-full rounded-r-lg border-0 bg-transparent py-2 pl-2 pr-3 text-navy placeholder-gray-400 focus:outline-none focus:ring-0"
                    aria-label="US phone number, 10 digits"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Why do you need access?
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  placeholder="Briefly describe what you’re looking for help with (e.g., anxiety, ADHD evaluation, medication management)."
                  className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-navy shadow-sm focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta"
                />
              </div>
              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-primary w-full"
              >
                {status === "submitting" ? "Submitting…" : "Request Access"}
              </button>
            </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
