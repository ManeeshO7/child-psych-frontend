"use client";

import { useState } from "react";

type ConfirmCancelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  appointmentLabel: string;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmCancelModal({
  isOpen,
  onClose,
  appointmentLabel,
  onConfirm,
}: ConfirmCancelModalProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" aria-modal="true" role="dialog">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        <h2 className="text-xl font-semibold text-navy dark:text-cream-100">Cancel appointment?</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to cancel this appointment? This cannot be undone.
        </p>
        {appointmentLabel && (
          <p className="mt-2 rounded-lg border border-cream-200 bg-cream-50/50 px-3 py-2 text-sm font-medium text-navy dark:border-neutral-700 dark:bg-neutral-900 dark:text-cream-100">
            {appointmentLabel}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
          >
            Keep appointment
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-lg border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:border-red-800"
          >
            {submitting ? "Cancelling…" : "Yes, cancel appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
