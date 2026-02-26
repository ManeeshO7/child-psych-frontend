"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { questionnaireToQandA } from "@/lib/questionnaireLabels";
import { formatPhone } from "@/lib/formatPhone";

const RED_FLAG_KEYS = [
  "activeSuicidalThoughts",
  "psychiatricHospitalization",
  "psychoticSymptoms",
  "severeAggression",
  "legalCustodyCourt",
  "childProtectiveServices",
] as const;

function getRecommendationStatus(
  questionnaireData: Record<string, unknown> | null | undefined
): "canBeRejected" | "canBeAccepted" | null {
  if (!questionnaireData || typeof questionnaireData !== "object") return null;
  const anyYes = RED_FLAG_KEYS.some(
    (key) => String(questionnaireData[key] ?? "").toLowerCase() === "yes"
  );
  return anyYes ? "canBeRejected" : "canBeAccepted";
}

type PatientRequest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string | null;
  status: string;
  rejectedNote: string | null;
  autoRejected?: boolean;
  createdAt: string;
  consentAt: string | null;
  questionnaireData: Record<string, unknown> | null;
  user: { id: string; email: string } | null;
};

export default function DoctorRequestsList() {
  const router = useRouter();
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [expandedPrescreen, setExpandedPrescreen] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "rejected">("pending");
  const [pageByTab, setPageByTab] = useState<Record<"pending" | "accepted" | "rejected", number>>({
    pending: 1,
    accepted: 1,
    rejected: 1,
  });
  const [deletingQuestionnaireId, setDeletingQuestionnaireId] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");

  const PAGE_SIZE = 10;

  function filterByName(list: PatientRequest[]): PatientRequest[] {
    const q = searchName.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        `${(r.firstName || "").toLowerCase()} ${(r.lastName || "").toLowerCase()}`.includes(q) ||
        (r.firstName || "").toLowerCase().includes(q) ||
        (r.lastName || "").toLowerCase().includes(q)
    );
  }

  async function load() {
    const res = await fetch("/api/patient-requests/", { credentials: "include" });
    if (res.status === 401) {
      router.push("/doctor/login");
      return;
    }
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/patient-requests/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to approve");
        return;
      }
      await load();
    } finally {
      setApprovingId(null);
    }
  }

  async function reject(id: string) {
    setRejectingId(id);
    try {
      const res = await fetch(`/api/patient-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectedNote: rejectNote[id] || undefined }),
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to reject");
        return;
      }
      setRejectNote((prev) => ({ ...prev, [id]: "" }));
      await load();
    } finally {
      setRejectingId(null);
    }
  }

  async function deleteQuestionnaire(requestId: string) {
    if (!confirm("Delete this patient's questionnaire (FHIR) response? The request will remain but they will need to submit the questionnaire again to be considered for approval.")) return;
    setDeletingQuestionnaireId(requestId);
    try {
      const res = await fetch(`/api/patient-requests/${requestId}/questionnaire`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/doctor/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || data.error || "Failed to delete questionnaire");
        return;
      }
      setExpandedPrescreen((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      await load();
    } finally {
      setDeletingQuestionnaireId(null);
    }
  }

  const pending = filterByName(
    requests.filter(
      (r) =>
        r.status === "pending" &&
        r.questionnaireData != null &&
        Object.keys(r.questionnaireData).length > 0
    )
  );
  const accepted = filterByName(requests.filter((r) => r.status === "approved"));
  const rejected = filterByName(requests.filter((r) => r.status === "rejected"));

  function paginate<T>(list: T[], tab: "pending" | "accepted" | "rejected") {
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(1, pageByTab[tab]), totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const items = list.slice(start, start + PAGE_SIZE);
    return { items, page, totalPages, total, start };
  }

  const setPage = (tab: "pending" | "accepted" | "rejected", page: number) => {
    setPageByTab((prev) => ({ ...prev, [tab]: page }));
  };

  const tabs: { id: "pending" | "accepted" | "rejected"; label: string }[] = [
    { id: "pending", label: "Pending" },
    { id: "accepted", label: "Accepted" },
    { id: "rejected", label: "Rejected" },
  ];

  function renderRequestCard(req: PatientRequest, showActions: boolean, statusBadge?: "accepted" | "rejected") {
    return (
      <li key={req.id} className="card">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">
              {req.firstName} {req.lastName}
            </p>
            <p className="text-sm text-gray-600">{req.email}</p>
            <p className="text-sm text-gray-600">{formatPhone(req.phone)}</p>
            {req.notes && (
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Notes:</span> {req.notes}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Submitted {new Date(req.createdAt).toLocaleString()}
              {req.consentAt && (
                <> · Consent {new Date(req.consentAt).toLocaleString()}</>
              )}
            </p>
            {req.autoRejected && (
              <span className="mt-2 inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Auto-rejected (provider may override)
              </span>
            )}
            {statusBadge === "rejected" && req.rejectedNote && (
              <p className="mt-2 text-sm text-red-700">
                <span className="font-medium">Rejection note:</span> {req.rejectedNote}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {req.questionnaireData && (() => {
              const rec = getRecommendationStatus(req.questionnaireData);
              if (!rec) return null;
              return (
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-medium ${
                    rec === "canBeRejected"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {rec === "canBeRejected" ? "Can be rejected" : "Can be accepted"}
                </span>
              );
            })()}
            {showActions ? (
            <>
              <button
                onClick={() => approve(req.id)}
                disabled={!!approvingId}
                className="btn-primary whitespace-nowrap"
              >
                {approvingId === req.id ? "Approving…" : "Approve"}
              </button>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Rejection note (optional)"
                  value={rejectNote[req.id] ?? ""}
                  onChange={(e) =>
                    setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))
                  }
                  className="rounded-lg border border-cream-200 px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => reject(req.id)}
                  disabled={!!rejectingId}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                >
                  {rejectingId === req.id ? "Rejecting…" : "Reject"}
                </button>
              </div>
            </>
            ) : statusBadge ? (
            <span
              className={`inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium ${
                statusBadge === "accepted"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {statusBadge === "accepted" ? "Accepted" : "Rejected"}
            </span>
          ) : null}
          </div>
        </div>
        {(req.consentAt || req.questionnaireData) && (
          <div className="mt-4 border-t border-cream-200 pt-4">
            <button
              type="button"
              onClick={() =>
                setExpandedPrescreen((prev) => {
                  const next = new Set(prev);
                  if (next.has(req.id)) next.delete(req.id);
                  else next.add(req.id);
                  return next;
                })
              }
              className="text-sm font-medium text-warm-brown hover:underline"
            >
              {expandedPrescreen.has(req.id) ? "Hide" : "Show"} pre-screening responses
            </button>
            {expandedPrescreen.has(req.id) && (
              <div className="mt-3 rounded-lg bg-gray-50 p-4">
                {req.consentAt && (
                  <p className="text-xs text-gray-600">
                    Consent given: {new Date(req.consentAt).toLocaleString()}
                  </p>
                )}
                {req.questionnaireData && Object.keys(req.questionnaireData).length > 0 ? (
                  <>
                    <div className="mt-2 max-h-80 overflow-auto rounded bg-white p-3 text-sm">
                      <dl className="space-y-3">
                        {questionnaireToQandA(req.questionnaireData).map(({ question, answer }, i) => (
                          <div key={i}>
                            <dt className="font-medium text-warm-brown">{question}</dt>
                            <dd className="mt-0.5 text-gray-800">{answer}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => deleteQuestionnaire(req.id)}
                        disabled={!!deletingQuestionnaireId}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingQuestionnaireId === req.id ? "Deleting…" : "Delete questionnaire (FHIR)"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No questionnaire data yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-6">
        <Link href="/doctor" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>
      <h1 className="section-heading">Patient Requests</h1>
      <p className="mt-2 text-gray-600">
        Review new patient access requests. Approve to create their account and send login credentials; reject to decline.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="requests-search" className="sr-only">
          Search by patient name
        </label>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </span>
          <input
            id="requests-search"
            type="search"
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setPageByTab({ pending: 1, accepted: 1, rejected: 1 });
            }}
            placeholder="Search by patient name…"
            className="w-full rounded-lg border border-cream-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-500 focus:border-warm-brown focus:ring-warm-brown"
            aria-label="Search by patient name"
          />
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="mt-10 rounded-xl border border-cream-200 bg-white p-2 shadow-sm">
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const count =
                  tab.id === "pending"
                    ? pending.length
                    : tab.id === "accepted"
                      ? accepted.length
                      : rejected.length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-warm-brown text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1.5 opacity-90">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 min-h-[200px]">
            {activeTab === "pending" && (() => {
              const { items, page, totalPages, total, start } = paginate(pending, "pending");
              return pending.length > 0 ? (
                <>
                  <ul className="space-y-4">
                    {items.map((req) => renderRequestCard(req, true))}
                  </ul>
                  {totalPages > 1 && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-600">
                        Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage("pending", page - 1)}
                          disabled={page <= 1}
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-warm-brown disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage("pending", page + 1)}
                          disabled={page >= totalPages}
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-warm-brown disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-cream-200 bg-white p-8 text-center text-gray-500 shadow-sm">
                  No pending requests.
                </p>
              );
            })()}
            {activeTab === "accepted" && (() => {
              const { items, page, totalPages, total, start } = paginate(accepted, "accepted");
              return accepted.length > 0 ? (
                <>
                  <ul className="space-y-4">
                    {items.map((req) => renderRequestCard(req, false, "accepted"))}
                  </ul>
                  {totalPages > 1 && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-600">
                        Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage("accepted", page - 1)}
                          disabled={page <= 1}
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-warm-brown disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage("accepted", page + 1)}
                          disabled={page >= totalPages}
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-warm-brown disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-cream-200 bg-white p-8 text-center text-gray-500 shadow-sm">
                  No accepted requests yet.
                </p>
              );
            })()}
            {activeTab === "rejected" && (() => {
              const { items, page, totalPages, total, start } = paginate(rejected, "rejected");
              return rejected.length > 0 ? (
                <>
                  <ul className="space-y-4">
                    {items.map((req) => renderRequestCard(req, !!req.autoRejected, "rejected"))}
                  </ul>
                  {totalPages > 1 && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cream-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-600">
                        Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage("rejected", page - 1)}
                          disabled={page <= 1}
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-warm-brown disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage("rejected", page + 1)}
                          disabled={page >= totalPages}
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-warm-brown disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-cream-200 bg-white p-8 text-center text-gray-500 shadow-sm">
                  No rejected requests yet.
                </p>
              );
            })()}
          </div>
        </>
      )}
    </main>
  );
}
