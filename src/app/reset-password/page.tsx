"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const next = searchParams.get("next") ?? "";
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

  if (!token) {
    return (
      <div className="card mt-10">
        <p className="text-gray-600">
          Use the password reset link from your email. If your link has expired, request a new one.
        </p>
        <Link href={backHref} className="mt-4 inline-block btn-primary">
          Back to Login
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="card mt-10 border-green-200 bg-green-50">
        <p className="font-medium text-green-800">Password updated</p>
        <p className="mt-2 text-sm text-green-700">You can now sign in with your new password.</p>
        <Link href={backHref} className="mt-4 inline-block btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-10 space-y-6">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New Password *
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
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
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
        {status === "submitting" ? "Updating…" : "Reset Password"}
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
          <h1 className="section-heading">Reset Password</h1>
          <p className="mt-2 text-gray-600">
            Set a new password using the secure link from your email. The link expires in 24 hours.
          </p>
          <Suspense fallback={<p className="mt-10 text-gray-500">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
