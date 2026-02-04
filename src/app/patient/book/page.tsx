"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PatientBookPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) {
      alert("Please select date and time.");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt,
          durationMinutes: 60,
          type: "followup",
          notes: notes || undefined,
        }),
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to book");
        return;
      }
      router.push("/patient");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="section-heading">Book an appointment</h1>
      <p className="mt-2 text-gray-600">
        Choose a date and time. Your provider will confirm.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={today}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Booking…" : "Request appointment"}
          </button>
          <Link href="/patient" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
