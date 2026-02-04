"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DoctorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/doctor-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.push("/doctor");
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 py-16">
        <div className="mx-auto max-w-sm px-4 sm:px-6 lg:px-8">
          <h1 className="section-heading">Doctor Portal — Login</h1>
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
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-warm-brown focus:outline-none focus:ring-1 focus:ring-warm-brown"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link href="/doctor/forgot-password" className="text-warm-brown hover:underline">
              Forgot password? Reset it here
            </Link>
          </p>
          <p className="mt-6 text-center text-sm text-gray-600">
            <Link href="/login" className="text-warm-brown hover:underline">
              Patient login
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
