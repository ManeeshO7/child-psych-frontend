"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Appointment = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  type: string;
  notes: string | null;
  patient?: { id: string; email: string; name: string };
};

export default function DoctorAppointmentsList() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/appointments/", { credentials: "include" });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/doctor" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>
      <h1 className="section-heading">Appointments</h1>
      <p className="mt-2 text-gray-600">
        Your upcoming and past appointments.
      </p>

      {loading ? (
        <p className="mt-10 text-gray-500">Loading…</p>
      ) : appointments.length === 0 ? (
        <p className="mt-10 text-gray-500">No appointments yet.</p>
      ) : (
        <ul className="mt-10 space-y-3">
          {appointments.slice(0, 50).map((a) => (
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
                  {a.patient?.name && ` · ${a.patient.name}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  a.status === "scheduled"
                    ? "bg-green-100 text-green-800"
                    : a.status === "cancelled"
                      ? "bg-gray-100 text-gray-600"
                      : "bg-blue-100 text-blue-800"
                }`}
              >
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
