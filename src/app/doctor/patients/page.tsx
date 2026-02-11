"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Patient = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  appointmentCount: number;
  intakeStatus: string | null;
};

export default function DoctorPatientsListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/patient-forms/patients", {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load patients");
      }
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/doctor" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>

      <h1 className="section-heading">Patients</h1>
      <p className="mt-2 text-gray-600">
        View all patients and their details, appointments, and form submissions.
      </p>

      {loading ? (
        <p className="mt-10 text-gray-500">Loading patients…</p>
      ) : error ? (
        <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
          <button
            type="button"
            onClick={loadPatients}
            className="mt-2 text-sm font-medium text-red-800 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : patients.length === 0 ? (
        <div className="mt-10 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No patients yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Approved patient requests will appear here once they have an account.
          </p>
        </div>
      ) : (
        <div className="mt-10">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Patient
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Intake
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Appointments
                  </th>
                  <th scope="col" className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {patient.name || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {patient.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {patient.intakeStatus ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            patient.intakeStatus === "submitted"
                              ? "bg-blue-100 text-blue-800"
                              : patient.intakeStatus === "reviewed"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {patient.intakeStatus}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {patient.appointmentCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/doctor/patients/${patient.id}`}
                        className="text-sm font-medium text-warm-brown hover:underline"
                      >
                        View details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
