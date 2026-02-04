"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Appointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  type: string;
  notes: string | null;
  doctor?: { id: string; email: string; name: string };
};

export default function PatientAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/appointments/", { credentials: "include" });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setAppointments(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.status === "scheduled" && new Date(a.scheduledAt) >= now
  );
  const past = appointments.filter(
    (a) => a.status !== "scheduled" || new Date(a.scheduledAt) < now
  );

  if (loading) {
    return <p className="text-gray-500">Loading appointments…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-warm-brown">Appointments</h2>
        <Link href="/patient/book" className="btn-primary">
          Book appointment
        </Link>
      </div>
      {upcoming.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-600">Upcoming</h3>
          <ul className="mt-2 space-y-3">
            {upcoming.map((a) => (
              <li key={a.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(a.scheduledAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {a.durationMinutes} min · {a.type}
                    {a.doctor?.name && ` · ${a.doctor.name}`}
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {upcoming.length === 0 && appointments.length === 0 && (
        <p className="text-gray-500">No appointments yet. Book one when you’re ready.</p>
      )}
      {past.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-600">Past</h3>
          <ul className="mt-2 space-y-2">
            {past.slice(0, 10).map((a) => (
              <li key={a.id} className="rounded-lg border border-cream-200 bg-white p-4 text-sm">
                <span className="text-gray-900">
                  {new Date(a.scheduledAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span className="ml-2 text-gray-500">· {a.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
