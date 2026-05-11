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
  durationMinutes,
  returnTo,
}: {
  appointmentId?: string | null;
  clientSecret: string;
  onSuccess: () => void | Promise<void>;
  slotStart?: string | null;
  slotEnd?: string | null;
  visitType?: string;
  durationMinutes?: number;
  returnTo?: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingDetails, setBillingDetails] = useState<{
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      // Store slot/return info in sessionStorage in case Stripe redirects (for 3D Secure, etc.)
      if (slotStart && !appointmentId) {
        sessionStorage.setItem("pendingAppointmentSlot", JSON.stringify({
          slotStart,
          slotEnd,
          visitType,
          durationMinutes,
        }));
      }
      if (appointmentId && returnTo) {
        sessionStorage.setItem("saveCardReturnTo", returnTo);
      }
      // Ensure AddressElement/PaymentElement validates and finalizes collected values.
      const submitResult = await elements.submit();
      if (submitResult.error) {
        setError(submitResult.error.message || "Please check card and billing details.");
        setLoading(false);
        return;
      }
      const hasBillingName = Boolean(billingDetails.name?.trim());
      const addr = billingDetails.address;
      const hasBillingAddress = Boolean(
        addr &&
          (addr.line1 || addr.city || addr.state || addr.postal_code || addr.country)
      );
      const confirmOptions: any = {
        elements,
        redirect: "if_required",
      };
      // Only pass explicit billing_details when we actually have values.
      // Passing empty fields can overwrite AddressElement-collected values in Stripe.
      if (hasBillingName || hasBillingAddress) {
        confirmOptions.confirmParams = {
          payment_method_data: {
            billing_details: {
              ...(hasBillingName ? { name: billingDetails.name } : {}),
              ...(hasBillingAddress ? { address: billingDetails.address } : {}),
            },
          },
        };
      }
      const { error: submitError, setupIntent } = await stripe.confirmSetup(confirmOptions);
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
          onChange={(event) => {
            const value = (event as { value?: { name?: string; address?: {
              line1?: string;
              line2?: string;
              city?: string;
              state?: string;
              postal_code?: string;
              country?: string;
            } } }).value;
            setBillingDetails({
              name: value?.name,
              address: value?.address
                ? {
                    line1: value.address.line1,
                    line2: value.address.line2,
                    city: value.address.city,
                    state: value.address.state,
                    postal_code: value.address.postal_code,
                    country: value.address.country,
                  }
                : undefined,
            });
          }}
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
  const returnTo = searchParams.get("returnTo");
  const slotStart = searchParams.get("slotStart");
  const slotEnd = searchParams.get("slotEnd");
  const visitType = searchParams.get("type") || "post_intake";
  const durationMinutesParam = searchParams.get("durationMinutes");
  const durationMinutes = durationMinutesParam ? parseInt(durationMinutesParam, 10) || 30 : 30;
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
          let durationMinutesToUse: number | null = durationMinutes;
          if (pendingSlotStr) {
            try {
              const pendingSlot = JSON.parse(pendingSlotStr);
              slotStartToUse = pendingSlot.slotStart;
              slotEndToUse = pendingSlot.slotEnd;
              visitTypeToUse = pendingSlot.visitType;
              if (typeof pendingSlot.durationMinutes === "number") {
                durationMinutesToUse = pendingSlot.durationMinutes;
              }
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
          // Redirect to confirmation page if we have slot info (orientation/self-book flow)
          if (!appointmentId && slotStartToUse) {
            router.push(
              `/patient/confirm-appointment?slotStart=${encodeURIComponent(
                slotStartToUse,
              )}&slotEnd=${encodeURIComponent(
                slotEndToUse || "",
              )}&type=${encodeURIComponent(visitTypeToUse)}&durationMinutes=${encodeURIComponent(
                String(durationMinutesToUse ?? 30),
              )}`,
            );
            return;
          }
          // If we have an appointment (doctor-scheduled flow), go to confirm-scheduled or returnTo
          const returnToParam =
            searchParams.get("returnTo") || sessionStorage.getItem("saveCardReturnTo");
          if (returnToParam) {
            sessionStorage.removeItem("saveCardReturnTo");
            router.push(returnToParam);
          } else {
            router.push("/patient");
          }
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
        )}&slotEnd=${encodeURIComponent(
          slotEnd || "",
        )}&type=${encodeURIComponent(visitType)}&durationMinutes=${encodeURIComponent(
          String(durationMinutes),
        )}`,
      );
      return;
    }
    // If we have returnTo (e.g. confirm-scheduled), go there; else dashboard
    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push("/patient");
    }
    router.refresh();
  };

  if (!stripePromise) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="section-heading">Save card on file</h1>
        <p className="mt-2 text-gray-600">
          Payments are not configured. Set <code className="text-sm bg-gray-100 px-1">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in the frontend .env.
        </p>
        <Link href="/patient" className="mt-4 inline-block text-cta hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="section-heading">Save card on file</h1>
      {appointment && pricing?.pricing?.[appointment.type] && (
        <div className="mt-3 rounded-lg border border-cta/20 bg-cream-50 p-3">
          <p className="text-sm font-medium text-cta">
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
          <Link href="/patient" className="mt-4 inline-block text-cta hover:underline">
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
              durationMinutes={durationMinutes}
              returnTo={returnTo}
            />
          </Elements>
        </div>
      )}

      <p className="mt-6">
        <Link href="/patient" className="text-sm text-cta hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </main>
  );
}
