"use client";

import { useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function DoctorForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/doctor/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show success to avoid leaking user existence
      if (!res.ok) {
        // still show success UX, but keep a generic message if needed
        setStatus("sent");
        return;
      }
      setStatus("sent");
    } catch {
      setErrorMessage("Network error");
      setStatus("error");
    }
  }

  return (
    <>
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Doctor Portal — Reset password</h1>
          <p className="mt-2 text-gray-600">
            Enter your email and we’ll send you a secure link to reset your password.
          </p>

          {status === "sent" ? (
            <div className="card mt-10 border-green-200 bg-green-50">
              <p className="font-medium text-green-800">Check your email</p>
              <p className="mt-2 text-sm text-green-700">
                If an account exists for that email, we sent a reset link. It expires in 24 hours.
              </p>
              <Link href="/doctor/login" className="mt-4 inline-block btn-primary">
                Back to Doctor Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card mt-10 space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-warm-brown focus:outline-none focus:ring-1 focus:ring-warm-brown"
                />
              </div>
              {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
              <button type="submit" disabled={status === "submitting"} className="btn-primary w-full">
                {status === "submitting" ? "Sending…" : "Send reset link"}
              </button>
              <div className="text-center text-sm text-gray-600">
                <Link href="/doctor/login" className="text-warm-brown hover:underline">
                  Back to Doctor Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

