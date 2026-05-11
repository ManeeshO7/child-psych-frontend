"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CardSummary = {
  hasCard: boolean;
  brand?: string | null;
  last4?: string | null;
};

type PaymentHistoryItem = {
  id?: string | null;
  status?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  createdAt?: string | null;
  receiptUrl?: string | null;
  invoicePdfUrl?: string | null;
  hostedInvoiceUrl?: string | null;
};

function formatMoney(amountCents?: number | null, currency?: string | null): string {
  const cents = typeof amountCents === "number" ? amountCents : 0;
  const curr = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return "Date unavailable";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Date unavailable";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Date unavailable";
  }
}

export default function PatientBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cardSummary, setCardSummary] = useState<CardSummary | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cardRes, historyRes] = await Promise.all([
          fetch("/api/payments/payment-method", { credentials: "include" }),
          fetch("/api/payments/history?limit=25", { credentials: "include" }),
        ]);

        if (cardRes.status === 401 || historyRes.status === 401) {
          router.push("/login");
          return;
        }

        if (!cancelled && cardRes.ok) {
          const cardData = await cardRes.json().catch(() => null);
          setCardSummary(cardData && typeof cardData === "object" ? (cardData as CardSummary) : null);
        }

        if (!cancelled && historyRes.ok) {
          const historyData = await historyRes.json().catch(() => null);
          const items = Array.isArray(historyData?.items) ? historyData.items : [];
          setPaymentHistory(items as PaymentHistoryItem[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-gray-500">Loading billing…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/patient" className="text-sm text-cta hover:underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 section-heading">Billing & Payments</h1>
      <p className="mt-2 text-gray-600">View invoices and payment receipts.</p>

      <div className="mt-6 card rounded-[20px] bg-white p-6 shadow-sm ring-1 ring-cta/10">
        <h2 className="text-lg font-semibold text-cta">Card on file</h2>
        {cardSummary?.hasCard ? (
          <p className="mt-2 text-navy">
            {(cardSummary.brand || "Card").toString().toUpperCase()} •••• {cardSummary.last4 || "—"}
          </p>
        ) : (
          <p className="mt-2 text-gray-600">No card on file.</p>
        )}
        <Link href="/patient/save-card?returnTo=/patient/billing" className="mt-3 inline-block text-sm font-medium text-cta hover:underline">
          {cardSummary?.hasCard ? "Manage card →" : "Add card →"}
        </Link>
      </div>

      <div className="mt-6 card rounded-[20px] bg-white p-6 shadow-sm ring-1 ring-cta/10">
        <h2 className="text-lg font-semibold text-cta">Invoices & Receipts</h2>
        {paymentHistory.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No payment history yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {paymentHistory.map((item) => {
              const viewUrl = item.hostedInvoiceUrl || item.receiptUrl || item.invoicePdfUrl;
              const downloadUrl = item.invoicePdfUrl || item.hostedInvoiceUrl || item.receiptUrl;
              return (
                <li key={item.id || `${item.createdAt}-${item.amountCents}`} className="rounded-xl border border-cream-200 bg-cream-50 p-4">
                  <p className="text-base font-semibold text-navy">
                    {formatMoney(item.amountCents, item.currency)}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatShortDate(item.createdAt)} · {(item.status || "paid").replaceAll("_", " ")}
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    {viewUrl && (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-cta hover:underline"
                      >
                        View invoice
                      </a>
                    )}
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-cta hover:underline"
                      >
                        Download invoice
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

