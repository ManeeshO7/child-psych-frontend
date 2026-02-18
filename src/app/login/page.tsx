"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/patient-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.push("/patient");
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">
          <h1 className="section-heading">Patient Login</h1>
          <p className="mt-2 text-gray-600">
            Sign in with the email and password you received after your access was approved.
          </p>
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
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 pr-10 text-gray-900 shadow-sm focus:border-warm-brown focus:outline-none focus:ring-1 focus:ring-warm-brown"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    // Eye with slash = password visible, click to hide
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                      <path
                        d="M10.58 10.58A3 3 0 0 0 9 12c0 1.66 1.34 3 3 3 0.69 0 1.33-0.23 1.84-0.62M16.24 16.24A5 5 0 0 1 12 17c-4.55 0-7.86-3.28-9-5 0.41-0.62 0.95-1.3 1.6-1.94M9.88 4.12A5.01 5.01 0 0 1 12 4c4.55 0 7.86 3.28 9 5-0.32 0.48-0.72 1-1.2 1.52"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    // Plain eye = password hidden, click to show
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        d="M1.5 12C2.67 9.33 5.64 5 12 5s9.33 4.33 10.5 7c-1.17 2.67-4.14 7-10.5 7S2.67 14.67 1.5 12z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            <Link href="/reset-password" className="text-warm-brown hover:underline">
              Forgot password? Reset it here
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            New patient?{" "}
            <Link href="/request-access" className="text-warm-brown hover:underline">
              Request access
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            <Link href="/doctor/login" className="text-warm-brown hover:underline">
              Doctor login
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
