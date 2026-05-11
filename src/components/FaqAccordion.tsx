"use client";

import { useState } from "react";

export type FaqItem = { question: string; answer: string };

export default function FaqAccordion({ items = [] }: { items?: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="mt-6 space-y-0 rounded-xl border border-gray-200 bg-white/80 text-base shadow-sm">
      {list.map((item, i) => {
        if (!item || typeof item.question !== "string") return null;
        const isOpen = openIndex === i;
        const id = `faq-answer-${i}`;
        return (
          <div
            key={i}
            className="border-b border-gray-200 last:border-b-0"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={id}
              id={`faq-question-${i}`}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-4 pl-5 pr-4 text-left font-semibold text-navy transition hover:bg-cream-100/80"
            >
              <span>{item.question}</span>
              <span
                className={`shrink-0 text-cta transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
            <div
              id={id}
              role="region"
              aria-labelledby={`faq-question-${i}`}
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="border-t border-gray-100 px-5 pb-4 pt-0 text-gray-700">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
