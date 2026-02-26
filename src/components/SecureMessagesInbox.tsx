"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Role = "patient" | "doctor";

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
};

type Thread = {
  id: string;
  patientId?: string;
  doctorId?: string;
  unreadCount: number;
  updatedAt?: string | null;
  counterparty: Contact;
  lastMessage?: {
    body?: string | null;
    createdAt?: string | null;
    senderId?: string | null;
  } | null;
};

type Message = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt?: string | null;
  readAt?: string | null;
};

type ThreadPayload = {
  thread: {
    id: string;
    patientId: string;
    doctorId: string;
    patientName: string;
    doctorName: string;
  };
  messages: Message[];
};

function formatDateTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function SecureMessagesInbox({ role }: { role: Role }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadPayload, setThreadPayload] = useState<ThreadPayload | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backHref = role === "doctor" ? "/doctor" : "/patient";
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredThreads = useMemo(() => {
    if (!normalizedQuery) return threads;
    return threads.filter((t) => {
      const haystack = [
        t.counterparty.name,
        t.counterparty.email,
        t.lastMessage?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [threads, normalizedQuery]);
  const filteredContacts = useMemo(() => {
    const list = normalizedQuery
      ? contacts.filter((c) =>
          [c.name, c.email].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery)
        )
      : contacts;
    return list.slice(0, 20);
  }, [contacts, normalizedQuery]);
  const selectedPatientId =
    role === "doctor"
      ? threadPayload?.thread?.patientId || selectedThread?.patientId || null
      : null;

  async function loadThreads() {
    const res = await fetch("/api/messages/", { credentials: "include" });
    if (res.status === 401) {
      window.location.href = role === "doctor" ? "/doctor/login" : "/login";
      return;
    }
    const data = await res.json().catch(() => null);
    const list = Array.isArray(data?.threads) ? (data.threads as Thread[]) : [];
    setThreads(list);
    if (!selectedThreadId && list.length > 0) setSelectedThreadId(list[0].id);
  }

  async function loadContacts() {
    const res = await fetch("/api/messages/contacts", { credentials: "include" });
    if (!res.ok) {
      setContacts([]);
      return;
    }
    const data = await res.json().catch(() => null);
    setContacts(Array.isArray(data?.contacts) ? (data.contacts as Contact[]) : []);
  }

  async function loadThreadMessages(threadId: string) {
    const res = await fetch(`/api/messages/threads/${encodeURIComponent(threadId)}`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json().catch(() => null)) as ThreadPayload | null;
    if (data?.thread) {
      setThreadPayload(data);
      // refresh sidebar unread counts after opening thread
      loadThreads();
    }
  }

  async function ensureThreadWithUser(userId: string): Promise<string | null> {
    const res = await fetch("/api/messages/thread-with-user", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.detail || "Unable to start conversation");
      return null;
    }
    const data = await res.json().catch(() => null);
    return typeof data?.threadId === "string" ? data.threadId : null;
  }

  async function sendMessage() {
    if (!selectedThreadId || !draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/threads/${encodeURIComponent(selectedThreadId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Unable to send message");
      }
      setDraft("");
      await loadThreadMessages(selectedThreadId);
      await loadThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send message");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        await Promise.all([loadThreads(), loadContacts()]);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      setThreadPayload(null);
      return;
    }
    loadThreadMessages(selectedThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    const el = messagesContainerRef.current;
    if (!el) return;
    // After messages render, jump to the latest message.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [selectedThreadId, threadPayload?.messages?.length]);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 py-6 sm:px-5 md:px-6 lg:px-8">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="section-heading">Secure Messages</h1>
        <Link href={backHref} className="text-sm font-medium text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </div>
      <p className="mt-2 text-gray-600">
        Private messaging between patients and doctors.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:h-[calc(100dvh-220px)] md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="flex min-h-0 max-h-[38dvh] flex-col rounded-xl border border-cream-200 bg-white p-4 shadow-sm md:h-full md:max-h-none md:p-5">
          <h2 className="text-sm font-semibold text-warm-brown">Conversations</h2>
          <div className="mt-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={role === "doctor" ? "Search patients…" : "Search doctors…"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-brown focus:ring-warm-brown"
            />
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : threads.length === 0 ? (
              role === "patient" ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    Messaging is available after you book an appointment with your doctor.
                  </p>
                  <Link
                    href="/patient/book"
                    className="inline-flex items-center text-sm font-medium text-warm-brown hover:underline"
                  >
                    Book Appointment →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No conversations yet.</p>
              )
            ) : filteredThreads.length === 0 ? (
              <p className="text-sm text-gray-500">No conversations match your search.</p>
            ) : (
              <ul className="space-y-2">
                {filteredThreads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(t.id)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left ${
                        selectedThreadId === t.id
                          ? "border-warm-brown/40 bg-warm-brown/5"
                          : "border-cream-200 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{t.counterparty.name || "Conversation"}</p>
                      {t.lastMessage?.body && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-gray-600">{t.lastMessage.body}</p>
                      )}
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">{formatDateTime(t.updatedAt)}</span>
                        {t.unreadCount > 0 && (
                          <span className="rounded-full bg-warm-brown px-2 py-0.5 text-[11px] text-white">
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {contacts.length > 0 && (
              <div className="mt-5 border-t border-cream-200 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Start new</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={async () => {
                        const threadId = await ensureThreadWithUser(c.id);
                        if (!threadId) return;
                        await loadThreads();
                        setSelectedThreadId(threadId);
                      }}
                      className="rounded-md border border-cream-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {c.name || c.email || c.id}
                    </button>
                  ))}
                </div>
                {filteredContacts.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">No matching contacts.</p>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="flex h-[60dvh] min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-cream-200 bg-white shadow-sm md:h-full md:min-h-0">
          <div className="border-b border-cream-200 px-4 py-3 md:px-5 md:py-3.5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-warm-brown">
                {selectedThread?.counterparty.name || "Inbox"}
              </h2>
              {role === "doctor" && selectedPatientId && (
                <Link
                  href={`/doctor/patients/${encodeURIComponent(selectedPatientId)}`}
                  className="rounded-md border border-cream-300 bg-white px-2.5 py-1.5 text-xs font-medium text-warm-brown hover:bg-cream-50"
                >
                  View Profile
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              🔒 Secure HIPAA-Compliant Messaging
            </p>
          </div>
          <div
            ref={messagesContainerRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5 md:py-5"
          >
            {!selectedThreadId && (
              <p className="text-sm text-gray-500">Select or start a conversation.</p>
            )}
            {selectedThreadId && !threadPayload && (
              <p className="text-sm text-gray-500">Loading messages…</p>
            )}
            {threadPayload?.messages?.map((m) => {
              const mine = m.senderId && threadPayload.thread
                ? (role === "patient" ? m.senderId === threadPayload.thread.patientId : m.senderId === threadPayload.thread.doctorId)
                : false;
              const statusLabel = mine ? (m.readAt ? "Read" : "Delivered") : null;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-warm-brown text-white" : "bg-gray-100 text-gray-900"
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-[11px] ${mine ? "text-white/80" : "text-gray-500"}`}>
                      {formatDateTime(m.createdAt)}
                      {statusLabel ? ` • ${statusLabel}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-cream-200 p-3 md:p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!selectedThreadId}
                rows={2}
                placeholder={selectedThreadId ? "Write a message…" : "Select a conversation first"}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-warm-brown focus:ring-warm-brown disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!selectedThreadId || !draft.trim() || busy}
                className="rounded-lg bg-warm-brown px-4 py-2 text-sm font-medium text-white hover:bg-warm-brown/90 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
