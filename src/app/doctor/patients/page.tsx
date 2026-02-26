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
            <span className="font-medium text-gray-900">{patient.name || "—"}</span>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{patient.email}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{patient.appointmentCount}</td>
          <td className="whitespace-nowrap px-4 py-3 text-right">
            <Link
              href={`/doctor/patients/${patient.id}`}
              className="text-sm font-medium text-warm-brown hover:underline"
            >
              View details →
            </Link>
          </td>
        </tr>
      ))
    );

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/doctor" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>

      <h1 className="section-heading">Patients</h1>
      <p className="mt-2 text-gray-600">
        View all patients and their details, appointments, and form submissions.
      </p>

      {!loading && !error && (total > 0 || searchApplied) && (
        <div className="mt-6">
          <label htmlFor="patient-search" className="sr-only">
            Search by patient name
          </label>
          <div className="relative max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </span>
            <input
              id="patient-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by patient name…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-gray-900 placeholder-gray-500 focus:border-warm-brown focus:ring-warm-brown sm:text-sm"
              aria-label="Search by patient name"
            />
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-gray-500">Loading patients…</p>
      ) : error ? (
        <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => loadPatients()}
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
                    Appointments
                  </th>
                  <th scope="col" className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tableRows}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
