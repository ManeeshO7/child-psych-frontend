"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function RequestNewLinkForm({
  backHref,
  boxClass,
}: {
  backHref: string;
  boxClass: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    const trimmed = (email || "").trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage("Please enter your email.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.detail || data.error || "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMessage("Network error");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={boxClass}>
        <h1 className="section-heading text-xl">Request new link</h1>
        <p className="mt-2 text-sm text-warm-brown/90">
          If an account exists with that email, we&apos;ve sent a new link to set or reset your password. It expires in 24 hours. Check your inbox (and spam folder).
        </p>
        <Link href={backHref} className="mt-6 inline-block btn-primary">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleRequestLink} className={`${boxClass} space-y-6`}>
      <h1 className="section-heading text-xl">Reset Password</h1>
      <p className="text-sm text-warm-brown/90">
        Use the link from your approval or password-reset email to set your password. If your link has expired or you never received one, enter your email below and we&apos;ll send a new link.
      </p>
      <div>
        <label htmlFor="request-email" className="block text-sm font-medium text-warm-brown">
          Email
        </label>
        <input
          id="request-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-warm-brown focus:outline-none focus:ring-1 focus:ring-warm-brown"
        />
      </div>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={status === "submitting"} className="btn-primary">
          {status === "submitting" ? "Sending…" : "Send new link"}
        </button>
        <Link href={backHref} className="text-sm text-warm-brown hover:underline">
          Back to Login
        </Link>
      </div>
    </form>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const next = searchParams.get("next") ?? "";
  const isSetup = searchParams.get("setup") === "1";
  const backHref = next === "doctor" ? "/doctor/login" : "/login";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    if (password !== confirm) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters");
      return;
    }
    if (!token) {
      setErrorMessage("Missing reset link. Use the link from your approval email.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to reset password");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMessage("Network error");
      setStatus("error");
    }
  }

  const boxClass = "rounded-md border border-cream-200 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]";

  if (!token) {
    return (
      <RequestNewLinkForm backHref={backHref} boxClass={boxClass} />
    );
  }

  if (status === "success") {
    return (
      <div className={boxClass}>
        <h1 className="section-heading text-xl">{isSetup ? "Set up your password" : "Reset Password"}</h1>
        <p className="mt-2 font-medium text-warm-brown">{isSetup ? "Password created" : "Password updated"}</p>
        <p className="mt-1 text-sm leading-relaxed text-warm-brown/90">
          Use your email and the password you just set to sign in.
        </p>
        <Link href={backHref} className="mt-6 inline-block btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${boxClass} space-y-6`}>
      <h1 className="section-heading text-xl">{isSetup ? "Set up your password" : "Reset Password"}</h1>
      <p className="text-sm text-warm-brown/90">
        {isSetup
          ? "Create a password for your account. This link expires in 24 hours."
          : "Set a new password using the secure link from your email. The link expires in 24 hours."}
      </p>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-warm-brown">
          {isSetup ? "Password" : "New Password"} *
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-warm-brown focus:outline-none focus:ring-1 focus:ring-warm-brown"
        />
        <p className="mt-1 text-xs text-gray-500">At least 8 characters</p>
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-warm-brown">
          Confirm Password *
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-warm-brown focus:outline-none focus:ring-1 focus:ring-warm-brown"
        />
      </div>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <button type="submit" disabled={status === "submitting"} className="btn-primary w-full">
        {status === "submitting" ? (isSetup ? "Creating…" : "Updating…") : (isSetup ? "Create password" : "Reset Password")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="rounded-md border border-cream-200 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"><p className="text-warm-brown/70">Loading…</p></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
