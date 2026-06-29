"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { questionnaireToQandA, QUESTIONNAIRE_LABELS } from "@/lib/questionnaireLabels";
import { formatPhone } from "@/lib/formatPhone";

const RED_FLAG_KEYS = [
  "activeSuicidalThoughts",
  "psychiatricHospitalization",
  "psychoticSymptoms",
  "severeAggression",
  "legalCustodyCourt",
  "childProtectiveServices",
] as const;

const RED_FLAG_LABEL_SET = new Set(
  RED_FLAG_KEYS.map((k) => QUESTIONNAIRE_LABELS[k]).filter(Boolean)
);

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
    const triggeredFlags = req.questionnaireData
      ? RED_FLAG_KEYS
          .filter((k) => String(req.questionnaireData![k] ?? "").toLowerCase() === "yes")
          .map((k) => QUESTIONNAIRE_LABELS[k] || k)
      : [];

    return (
      <li key={req.id} className="card">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-navy">
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
        {triggeredFlags.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Rejection flag{triggeredFlags.length > 1 ? "s" : ""} — answered Yes</p>
            </div>
            <ul className="space-y-1">
              {triggeredFlags.map((label, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 mt-1.5" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

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
              className="text-sm font-medium text-cta hover:underline"
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
                      <dl className="space-y-2">
                        {questionnaireToQandA(req.questionnaireData).map(({ question, answer }, i) => {
                          const isFlag = RED_FLAG_LABEL_SET.has(question) && answer.toLowerCase() === "yes";
                          return (
                            <div
                              key={i}
                              className={isFlag
                                ? "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                                : "px-1 py-1"
                              }
                            >
                              <dt className={`font-medium flex items-center gap-1.5 ${isFlag ? "text-amber-700" : "text-cta"}`}>
                                {isFlag && (
                                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                  </svg>
                                )}
                                {question}
                              </dt>
                              <dd className={`mt-0.5 font-semibold ${isFlag ? "text-amber-800 uppercase tracking-wide" : "text-navy"}`}>
                                {answer}
                              </dd>
                            </div>
                          );
                        })}
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
    <div className="min-h-screen bg-cream-50/60">
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/doctor" className="inline-flex items-center gap-1 text-sm text-cta hover:underline mb-6">
        ← Back to dashboard
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50">
            <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy">Patient Requests</h1>
            <p className="text-sm text-gray-500">Approve to create accounts; reject to decline.</p>
          </div>
        </div>

        <label htmlFor="requests-search" className="sr-only">Search by patient name</label>
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
            className="w-full rounded-xl border border-cream-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy placeholder-gray-400 shadow-sm focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20"
            aria-label="Search by patient name"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-7 w-7 animate-spin text-cta" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm text-gray-500">Loading requests…</p>
          </div>
        </div>
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
                        ? "bg-cta text-white"
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
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-cta disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
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
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-cta disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
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
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-cta disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
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
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-cta disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
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
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-cta disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
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
                          className="rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-sm font-medium text-cta disabled:cursor-not-allowed disabled:opacity-50 hover:bg-cream-50"
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
    </div>
  );
}
