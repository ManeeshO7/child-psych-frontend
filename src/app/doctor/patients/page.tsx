"use client";

import { useEffect, useRef, useState } from "react";
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

const PAGE_SIZE = 10;

export default function DoctorPatientsListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const prevSearchRef = useRef(searchApplied);

  useEffect(() => {
    const t = setTimeout(() => setSearchApplied(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== searchApplied;
    if (searchChanged) {
      prevSearchRef.current = searchApplied;
      setPage(1);
    }
    loadPatients(searchChanged ? 1 : page, searchApplied || undefined);
  }, [page, searchApplied]);

  async function loadPatients(pageNum: number = 1, searchQuery?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      });
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/patient-forms/patients?${params}`, {
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
      setPatients(Array.isArray(data.patients) ? data.patients : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setPage(typeof data.page === "number" ? data.page : pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
      setPatients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filteredPatients = patients;

  const tableRows =
    filteredPatients.length === 0 ? (
      <tr>
        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
          {searchApplied ? `No patients match "${searchApplied}".` : "No patients yet."}
        </td>
      </tr>
    ) : (
      filteredPatients.map((patient) => (
        <tr key={patient.id} className="hover:bg-gray-50">
          <td className="whitespace-nowrap px-4 py-3">
            <span className="font-medium text-navy">{patient.name || "—"}</span>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{patient.email}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{patient.appointmentCount}</td>
          <td className="whitespace-nowrap px-4 py-3 text-right">
            <Link
              href={`/doctor/patients/${patient.id}`}
              className="text-sm font-medium text-cta hover:underline"
            >
              View details →
            </Link>
          </td>
        </tr>
      ))
    );

  return (
    <div className="min-h-screen bg-cream-50/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <Link href="/doctor" className="inline-flex items-center gap-1 text-sm text-cta hover:underline mb-6">
          ← Back to dashboard
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50">
                <svg className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy">Patients</h1>
                <p className="text-sm text-gray-500">
                  {total > 0 ? `${total} patient${total !== 1 ? "s" : ""}` : "View all patients and their details"}
                </p>
              </div>
            </div>
          </div>

          {!loading && !error && (total > 0 || searchApplied) && (
            <div className="relative w-full max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
              <input
                id="patient-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by patient name…"
                className="w-full rounded-xl border border-cream-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy placeholder-gray-400 shadow-sm focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
                aria-label="Search by patient name"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-7 w-7 animate-spin text-cta" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-gray-500">Loading patients…</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="font-medium text-red-800">{error}</p>
            <button type="button" onClick={() => loadPatients()} className="mt-2 text-sm font-medium text-red-700 hover:underline">
              Try again
            </button>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-300 bg-white py-20 text-center">
            <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-gray-500">
              {searchApplied ? `No patients match "${searchApplied}"` : "No patients yet"}
            </p>
            <p className="mt-1 text-xs text-gray-400">Approved patient requests will appear here.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-cream-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50/80">
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Patient
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Appointments
                  </th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                      {searchApplied ? `No patients match "${searchApplied}".` : "No patients yet."}
                    </td>
                  </tr>
                ) : filteredPatients.map((patient) => (
                  <tr key={patient.id} className="group transition hover:bg-cream-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cta/10 text-sm font-semibold text-cta">
                          {(patient.name || "?")[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-navy">{patient.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{patient.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-cta/10 px-2.5 py-1 text-xs font-semibold text-cta">
                        {patient.appointmentCount} appt{patient.appointmentCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/doctor/patients/${patient.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:border-cta/30 hover:text-cta"
                      >
                        View details
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-cream-200 bg-cream-50/50 px-6 py-4">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} patients
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-xl border border-cream-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-cream-50 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-xl border border-cream-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-cream-50 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
