"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, PaymentElement, AddressElement } from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function SaveCardForm({
  appointmentId,
  clientSecret,
  onSuccess,
  slotStart,
  slotEnd,
  visitType,
}: {
  appointmentId?: string | null;
  clientSecret: string;
  onSuccess: () => void | Promise<void>;
  slotStart?: string | null;
  slotEnd?: string | null;
  visitType?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      // Store slot info in sessionStorage in case Stripe redirects (for 3D Secure, etc.)
      if (slotStart && !appointmentId) {
        sessionStorage.setItem("pendingAppointmentSlot", JSON.stringify({
          slotStart,
          slotEnd,
          visitType,
        }));
      }
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (submitError) {
        setError(submitError.message || "Failed to save card");
        setLoading(false);
        return;
      }
      const paymentMethodId = setupIntent?.payment_method;
      if (typeof paymentMethodId !== "string") {
        setError("Could not get payment method");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/payments/confirm-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, paymentMethodId }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Failed to confirm card on file");
        setLoading(false);
        return;
      }
      await onSuccess();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="mb-4">
        <AddressElement
          options={{
            mode: "billing",
            fields: {
              phone: "never",
            },
            display: {
              name: "full",
            },
          }}
        />
      </div>
      <PaymentElement
        options={{
          fields: {
            billingDetails: {
              address: "never",
            },
          },
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="btn-primary disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save card on file"}
      </button>
    </form>
  );
}

type Pricing = {
  pricing: {
    [key: string]: {
      amountCents: number;
      amountDollars: number;
      formatted: string;
    };
  };
};

type Appointment = {
  id: string;
  type: string;
};

export default function PatientSaveCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const slotStart = searchParams.get("slotStart");
  const slotEnd = searchParams.get("slotEnd");
  const visitType = searchParams.get("type") || "post_intake";
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  // Handle Stripe redirect case (when user comes back from 3D Secure or similar)
  useEffect(() => {
    const setupIntentId = searchParams.get("setup_intent");
    const setupIntentClientSecret = searchParams.get("setup_intent_client_secret");
    const redirectStatus = searchParams.get("redirect_status");

    if (setupIntentId && setupIntentClientSecret && redirectStatus === "succeeded") {
      // User was redirected back from Stripe (e.g., 3D Secure)
      // Complete the flow by confirming the card and creating appointment
      (async () => {
        try {
          setLoading(true);
          // Retrieve slot info from sessionStorage if available
          const pendingSlotStr = sessionStorage.getItem("pendingAppointmentSlot");
          let slotStartToUse = slotStart;
          let slotEndToUse = slotEnd;
          let visitTypeToUse = visitType;
          if (pendingSlotStr) {
            try {
              const pendingSlot = JSON.parse(pendingSlotStr);
              slotStartToUse = pendingSlot.slotStart;
              slotEndToUse = pendingSlot.slotEnd;
              visitTypeToUse = pendingSlot.visitType;
              sessionStorage.removeItem("pendingAppointmentSlot");
            } catch {
              // Ignore parse errors
            }
          }
          // Retrieve the setup intent to get payment method
          const stripe = await stripePromise;
          if (!stripe) {
            setError("Stripe not initialized");
            setLoading(false);
            return;
          }
          const { setupIntent } = await stripe.retrieveSetupIntent(setupIntentClientSecret);
          const paymentMethodId = setupIntent?.payment_method;
          if (typeof paymentMethodId !== "string") {
            setError("Could not get payment method from redirect");
            setLoading(false);
            return;
          }
          // Confirm the card on the backend
          const res = await fetch("/api/payments/confirm-card", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointmentId, paymentMethodId }),
            credentials: "include",
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.detail || "Failed to confirm card on file");
            setLoading(false);
            return;
          }
          // Redirect to confirmation page if we have slot info
          if (!appointmentId && slotStartToUse) {
            router.push(
              `/patient/confirm-appointment?slotStart=${encodeURIComponent(
                slotStartToUse,
              )}&slotEnd=${encodeURIComponent(slotEndToUse || "")}&type=${encodeURIComponent(visitTypeToUse)}`,
            );
            return;
          }
          // If we already have an appointment, go to dashboard
          router.push("/patient");
          router.refresh();
        } catch (err) {
          setError("Failed to complete card save after redirect");
          setLoading(false);
        }
      })();
      return;
    }

    // Don't proceed with normal flow if we're handling a redirect
    if (setupIntentId) return;

    // Normal flow: load setup intent
    let cancelled = false;
    (async () => {
      try {
        // Allow saving/updating a card even without an appointment or selected slot (e.g. from dashboard).
        const res = await fetch("/api/payments/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId }),
          credentials: "include",
        });
        if (cancelled) return;
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.detail || "Failed to load form");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setClientSecret(data.clientSecret || null);
        if (!data.clientSecret) setError("No client secret returned");
      } catch {
        if (!cancelled) setError("Network error");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, slotStart, router, searchParams]);

  const handleSuccess = async () => {
    // If we don't yet have an appointment but do have a selected slot, redirect to confirmation page
    if (!appointmentId && slotStart) {
      // Redirect to confirmation page with slot information
      router.push(
        `/patient/confirm-appointment?slotStart=${encodeURIComponent(
          slotStart,
        )}&slotEnd=${encodeURIComponent(slotEnd || "")}&type=${encodeURIComponent(visitType)}`,
      );
      return;
    }
    // If we already have an appointment, just go to dashboard
    router.push("/patient");
    router.refresh();
  };

  if (!stripePromise) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="section-heading">Save card on file</h1>
        <p className="mt-2 text-gray-600">
          Payments are not configured. Set <code className="text-sm bg-gray-100 px-1">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in the frontend .env.
        </p>
        <Link href="/patient" className="mt-4 inline-block text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="section-heading">Save card on file</h1>
      {appointment && pricing?.pricing?.[appointment.type] && (
        <div className="mt-3 rounded-lg border border-warm-brown/20 bg-cream-50 p-3">
          <p className="text-sm font-medium text-warm-brown">
            Visit fee: {pricing.pricing[appointment.type].formatted}
          </p>
        </div>
      )}
      <p className="mt-2 text-gray-600">
        Your card will be stored securely by Stripe. You will not be charged now; the practice will charge the visit
        fee after your visit.
      </p>

      {loading ? (
        <p className="mt-6 text-gray-500">Loading secure form…</p>
      ) : error || !clientSecret ? (
        <div className="mt-6">
          <p className="text-red-600">{error || "Could not load payment form."}</p>
          <Link href="/patient" className="mt-4 inline-block text-warm-brown hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-cream-200 bg-white p-6 shadow-sm">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <SaveCardForm
              appointmentId={appointmentId}
              clientSecret={clientSecret}
              onSuccess={handleSuccess}
              slotStart={slotStart}
              slotEnd={slotEnd}
              visitType={visitType}
            />
          </Elements>
        </div>
      )}

      <p className="mt-6">
        <Link href="/patient" className="text-sm text-warm-brown hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </main>
  );
}
