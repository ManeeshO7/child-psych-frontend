"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, EyeOff, Brain, Lock } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease, delay: i * 0.08 },
  }),
};

export default function DoctorLoginPage() {
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
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel: branding ── */}
      <div className="relative hidden w-[45%] flex-col overflow-hidden bg-gradient-to-br from-[#4a6e5a] via-[#5f8a6e] to-[#3d5a49] lg:flex">
        {/* Animated blobs */}
        <motion.div
          className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute bottom-10 right-0 h-64 w-64 rounded-full bg-white/8 blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.55, 0.3] }}
          transition={{ repeat: Infinity, duration: 9, ease: "easeInOut", delay: 2 }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-12">
          {/* Logo */}
          <Link href="/" className="flex flex-col items-start">
            <span className="text-3xl font-bold tracking-tight text-white">TP</span>
            <span className="text-sm font-medium text-white/70">TelePsych</span>
          </Link>

          {/* Center copy */}
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Brain className="h-7 w-7 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold leading-snug text-white">
              Doctor Portal
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/70">
              Secure access to your patient dashboard, appointment management, and clinical records.
            </p>

            <div className="mt-10 space-y-4">
              {[
                { icon: <ShieldCheck className="h-4 w-4" />, text: "HIPAA-compliant & encrypted" },
                { icon: <Lock className="h-4 w-4" />, text: "Session-secured access" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                    {icon}
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} TelePsych. For authorized medical staff only.
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex flex-1 flex-col bg-[#f7f3ed]">
        {/* Mobile logo */}
        <div className="flex items-center justify-between px-6 pt-6 lg:hidden">
          <Link href="/" className="flex flex-col">
            <span className="text-xl font-bold text-cta">TP</span>
            <span className="text-xs font-medium text-gray-500">TelePsych</span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
          <motion.div
            className="w-full max-w-md"
            initial="hidden"
            animate="show"
          >
            {/* Header */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="mb-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-cta/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cta ring-1 ring-cta/20">
                <span className="h-1.5 w-1.5 rounded-full bg-cta animate-pulse" />
                Secure Access
              </span>
              <h1 className="mt-4 text-3xl font-bold text-navy">Welcome back</h1>
              <p className="mt-1.5 text-sm text-gray-500">Sign in to your doctor portal</p>
            </motion.div>

            {/* Form card */}
            <motion.form
              onSubmit={handleSubmit}
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="rounded-2xl bg-white p-8 shadow-[0_4px_32px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.04]"
            >
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="doctor@telepsych.com"
                  className="mt-2 block w-full rounded-xl border border-cream-200/80 bg-cream-50/50 px-4 py-3 text-navy placeholder:text-gray-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition focus:border-cta focus:bg-white focus:outline-none focus:ring-2 focus:ring-cta/30"
                />
              </div>

              {/* Password */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link href="/doctor/forgot-password" className="text-xs font-medium text-cta hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-cream-200/80 bg-cream-50/50 px-4 py-3 pr-12 text-navy placeholder:text-gray-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition focus:border-cta focus:bg-white focus:outline-none focus:ring-2 focus:ring-cta/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-cta transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 ring-1 ring-red-100"
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="mt-6 w-full rounded-xl bg-cta px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(122,158,132,0.4)] transition-colors hover:bg-cta-hover disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in…
                  </span>
                ) : "Sign In"}
              </motion.button>
            </motion.form>

            {/* Footer links */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="mt-6 text-center text-sm text-gray-500">
              Not a doctor?{" "}
              <Link href="/login" className="font-medium text-cta hover:underline">
                Patient login
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
