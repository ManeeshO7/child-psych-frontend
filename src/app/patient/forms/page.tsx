"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PHQA_QUESTIONNAIRE_KEY,
  PHQA_QUESTIONS,
  PHQA_OPTIONS,
  PHQA_FUNCTIONAL_IMPAIRMENT_OPTIONS,
  PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION,
} from "@/lib/phqa";
import {
  PHQ9_QUESTIONNAIRE_KEY,
  PHQ9_QUESTIONS,
  PHQ9_OPTIONS,
} from "@/lib/phq9";
import {
  SCARED_CHILD_QUESTIONNAIRE_KEY,
  SCARED_CHILD_QUESTIONS,
  SCARED_CHILD_OPTIONS,
} from "@/lib/scaredChild";
import {
  SCARED_PARENT_QUESTIONNAIRE_KEY,
  SCARED_PARENT_QUESTIONS,
  SCARED_PARENT_OPTIONS,
} from "@/lib/scaredParent";
import {
  ADHD_PARENT_RATING_QUESTIONNAIRE_KEY,
  ADHD_PARENT_RATING_OPTIONS,
  ADHD_PARENT_INATTENTION_QUESTIONS,
  ADHD_PARENT_HYPERACTIVITY_QUESTIONS,
  ADHD_PARENT_FUNCTIONAL_IMPACT_QUESTIONS,
  ADHD_PARENT_ALL_QUESTIONS,
} from "@/lib/adhdParentRating";
import {
  ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY,
  ADHD_TEACHER_RATING_OPTIONS,
  ADHD_TEACHER_INATTENTION_QUESTIONS,
  ADHD_TEACHER_HYPERACTIVITY_QUESTIONS,
  ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS,
  ADHD_TEACHER_ALL_QUESTIONS,
} from "@/lib/adhdTeacherRating";

type FormAssignment = {
  id: string;
  formId: string;
  form: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    questionnaireKey: string | null;
  };
  status: string; // "pending" | "completed"
  assignedAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  uploadUrl: string | null;
};

export default function PatientFormsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<Record<string, Record<string, any>>>({});
  const [completedSectionReady, setCompletedSectionReady] = useState(false);
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);
  const lastNavAtRef = useRef(0);
  const lastExpandClickAtRef = useRef(0);
  const lastCompletedClickAtRef = useRef(0);

  const NAV_THROTTLE_MS = 1500;
  const CLICK_THROTTLE_MS = 1500;

  function handleBackToDashboard(e: React.MouseEvent) {
    e.preventDefault();
    const now = Date.now();
    if (now - lastNavAtRef.current < NAV_THROTTLE_MS) return;
    lastNavAtRef.current = now;
    router.push("/patient");
  }

  function handleExpandPending(assignmentId: string) {
    const now = Date.now();
    if (now - lastExpandClickAtRef.current < CLICK_THROTTLE_MS) return;
    lastExpandClickAtRef.current = now;
    setExpandedPendingId(assignmentId);
  }

  function handleCompletedSectionClick(e: React.MouseEvent) {
    const now = Date.now();
    if (now - lastCompletedClickAtRef.current < CLICK_THROTTLE_MS) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      lastCompletedClickAtRef.current = now;
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) setCompletedSectionReady(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(type: "success" | "error", message: string) {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    setNotice({ type, message });
    noticeTimeoutRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimeoutRef.current = null;
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  async function loadAssignments() {
    setLoading(true);
    try {
      const res = await fetch("/api/patient-forms/my-forms", {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load forms");
      }
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showNotice("error", "Failed to load forms. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuestionnaireSubmit(assignmentId: string, formKey: string) {
    const responses = questionnaireResponses[assignmentId];
    if (!responses || Object.keys(responses).length === 0) {
      showNotice("error", "Please fill out the questionnaire before submitting.");
      return;
    }
    if (formKey === PHQA_QUESTIONNAIRE_KEY) {
      const required = PHQA_QUESTIONS.map((q) => q.linkId);
      const missing = required.filter((id) => responses[id] === undefined || responses[id] === "");
      if (missing.length > 0) {
        showNotice("error", "Please answer all 9 questions before submitting.");
        return;
      }
    }
    if (formKey === PHQ9_QUESTIONNAIRE_KEY) {
      const required = PHQ9_QUESTIONS.map((q) => q.linkId);
      const missing = required.filter((id) => responses[id] === undefined || responses[id] === "");
      if (missing.length > 0) {
        showNotice("error", "Please answer all 9 questions before submitting.");
        return;
      }
    }
    if (formKey === SCARED_CHILD_QUESTIONNAIRE_KEY) {
      const required = SCARED_CHILD_QUESTIONS.map((q) => q.linkId);
      const missing = required.filter((id) => responses[id] === undefined || responses[id] === "");
      if (missing.length > 0) {
        showNotice("error", "Please answer all 41 questions before submitting.");
        return;
      }
    }
    if (formKey === SCARED_PARENT_QUESTIONNAIRE_KEY) {
      const required = SCARED_PARENT_QUESTIONS.map((q) => q.linkId);
      const missing = required.filter((id) => responses[id] === undefined || responses[id] === "");
      if (missing.length > 0) {
        showNotice("error", "Please answer all 41 questions before submitting.");
        return;
      }
    }
    if (formKey === ADHD_PARENT_RATING_QUESTIONNAIRE_KEY) {
      const required = ADHD_PARENT_ALL_QUESTIONS.map((q) => q.linkId);
      const missing = required.filter((id) => responses[id] === undefined || responses[id] === "");
      if (missing.length > 0) {
        showNotice("error", "Please answer all questions before submitting.");
        return;
      }
    }
    if (formKey === ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY) {
      const required = ADHD_TEACHER_ALL_QUESTIONS.map((q) => q.linkId);
      const missing = required.filter((id) => responses[id] === undefined || responses[id] === "");
      if (missing.length > 0) {
        showNotice("error", "Please answer all questions before submitting.");
        return;
      }
    }

    setSubmitting(assignmentId);
    try {
      const res = await fetch("/api/patient-forms/submit-questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assignmentId,
          responses,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to submit questionnaire");
      }

      showNotice("success", "Questionnaire submitted successfully!");
      loadAssignments();
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to submit questionnaire.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handlePdfUpload(assignmentId: string, file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showNotice("error", "Please upload a PDF file.");
      return;
    }

    setUploading(assignmentId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/patient-forms/upload-pdf/${assignmentId}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to upload PDF");
      }

      showNotice("success", "PDF uploaded successfully!");
      await loadAssignments();
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to upload PDF.");
    } finally {
      setUploading(null);
    }
  }

  function updateQuestionnaireResponse(assignmentId: string, key: string, value: any) {
    startTransition(() => {
      setQuestionnaireResponses((prev) => ({
        ...prev,
        [assignmentId]: {
          ...prev[assignmentId],
          [key]: value,
        },
      }));
    });
  }

  function renderQuestionnaireForm(assignment: FormAssignment) {
    const formKey = assignment.form.questionnaireKey || "default";
    const responses = questionnaireResponses[assignment.id] || {};

    if (formKey === PHQA_QUESTIONNAIRE_KEY) {
      return (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            <strong>Timeframe: 2 weeks.</strong> Choose one response for each item:{" "}
            <strong>Not at all</strong>, <strong>Several days</strong>, <strong>More than half the days</strong>, or{" "}
            <strong>Nearly every day</strong>.
          </p>
          <ul className="space-y-3">
            {PHQA_QUESTIONS.map((q) => (
              <li key={q.linkId} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-700">{q.question}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {PHQA_OPTIONS.map((opt) => (
                    <label key={opt.value} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${assignment.id}-${q.linkId}`}
                        checked={Number(responses[q.linkId]) === opt.value}
                        onChange={() =>
                          updateQuestionnaireResponse(assignment.id, q.linkId, opt.value)
                        }
                        className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-sm font-medium text-gray-700">
              Optional functional impairment question
            </p>
            <p className="mt-1 text-sm text-gray-700">{PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.question}</p>
            <div className="mt-2 flex flex-wrap gap-4">
              {PHQA_FUNCTIONAL_IMPAIRMENT_OPTIONS.map((opt) => (
                <label key={opt.value} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${assignment.id}-${PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.linkId}`}
                    checked={
                      Number(responses[PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.linkId]) === opt.value
                    }
                    onChange={() =>
                      updateQuestionnaireResponse(
                        assignment.id,
                        PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.linkId,
                        opt.value
                      )
                    }
                    className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleQuestionnaireSubmit(assignment.id, formKey)}
            disabled={submitting === assignment.id}
            className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
          >
            {submitting === assignment.id ? "Submitting…" : "Submit PHQ-A"}
          </button>
        </div>
      );
    }

    if (formKey === PHQ9_QUESTIONNAIRE_KEY) {
      return (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Over the past 2 weeks, please choose one response for each question: Not at all, Several days, More than half the days, or Nearly every day. Your answers help your care team understand your current emotional well-being and provide the right support.
          </p>
          <ul className="space-y-3">
            {PHQ9_QUESTIONS.map((q) => (
              <li key={q.linkId} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-700">{q.question}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {PHQ9_OPTIONS.map((opt) => (
                    <label key={opt.value} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${assignment.id}-${q.linkId}`}
                        checked={Number(responses[q.linkId]) === opt.value}
                        onChange={() =>
                          updateQuestionnaireResponse(assignment.id, q.linkId, opt.value)
                        }
                        className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handleQuestionnaireSubmit(assignment.id, formKey)}
            disabled={submitting === assignment.id}
            className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
          >
            {submitting === assignment.id ? "Submitting…" : "Submit PHQ-9"}
          </button>
        </div>
      );
    }

    if (formKey === SCARED_CHILD_QUESTIONNAIRE_KEY) {
      return (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            <strong>Timeframe: Past 3 months.</strong> Response scale:{" "}
            <strong>Not true</strong>, <strong>Somewhat true</strong>, or <strong>Very true</strong>.
          </p>
          <ul className="space-y-3">
            {SCARED_CHILD_QUESTIONS.map((q, idx) => (
              <li key={q.linkId} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-700">{idx + 1}. {q.question}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {SCARED_CHILD_OPTIONS.map((opt) => (
                    <label key={opt.value} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${assignment.id}-${q.linkId}`}
                        checked={Number(responses[q.linkId]) === opt.value}
                        onChange={() =>
                          updateQuestionnaireResponse(assignment.id, q.linkId, opt.value)
                        }
                        className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handleQuestionnaireSubmit(assignment.id, formKey)}
            disabled={submitting === assignment.id}
            className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
          >
            {submitting === assignment.id ? "Submitting…" : "Submit SCARED Child"}
          </button>
        </div>
      );
    }

    if (formKey === SCARED_PARENT_QUESTIONNAIRE_KEY) {
      return (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            <strong>Timeframe: Past 3 months.</strong> Response scale:{" "}
            <strong>Not true</strong>, <strong>Somewhat true</strong>, or <strong>Very true</strong>.
          </p>
          <ul className="space-y-3">
            {SCARED_PARENT_QUESTIONS.map((q, idx) => (
              <li key={q.linkId} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-700">{idx + 1}. {q.question}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {SCARED_PARENT_OPTIONS.map((opt) => (
                    <label key={opt.value} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${assignment.id}-${q.linkId}`}
                        checked={Number(responses[q.linkId]) === opt.value}
                        onChange={() =>
                          updateQuestionnaireResponse(assignment.id, q.linkId, opt.value)
                        }
                        className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handleQuestionnaireSubmit(assignment.id, formKey)}
            disabled={submitting === assignment.id}
            className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
          >
            {submitting === assignment.id ? "Submitting…" : "Submit SCARED Parent"}
          </button>
        </div>
      );
    }

    if (formKey === ADHD_PARENT_RATING_QUESTIONNAIRE_KEY) {
      const renderQuestionList = (
        title: string,
        questions: { linkId: string; question: string }[],
        startIndex: number
      ) => (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy">{title}</h4>
          <ul className="space-y-3">
            {questions.map((q, i) => (
              <li key={q.linkId} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-700">
                  {startIndex + i}. {q.question}
                </p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {ADHD_PARENT_RATING_OPTIONS.map((opt) => (
                    <label key={opt.value} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${assignment.id}-${q.linkId}`}
                        checked={Number(responses[q.linkId]) === opt.value}
                        onChange={() =>
                          updateQuestionnaireResponse(assignment.id, q.linkId, opt.value)
                        }
                        className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );

      return (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            <strong>Timeframe: Past 6 months.</strong> Response scale:{" "}
            <strong>Never/Rarely</strong>, <strong>Sometimes</strong>, <strong>Often</strong>, or{" "}
            <strong>Very Often</strong>.
          </p>

          {renderQuestionList("Section A: Inattention (Items 1–9)", ADHD_PARENT_INATTENTION_QUESTIONS, 1)}
          {renderQuestionList(
            "Section B: Hyperactivity / Impulsivity (Items 10–18)",
            ADHD_PARENT_HYPERACTIVITY_QUESTIONS,
            10
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-navy">Section C: Functional Impact</h4>
            <ul className="space-y-3">
              {ADHD_PARENT_FUNCTIONAL_IMPACT_QUESTIONS.map((q) => (
                <li key={q.linkId} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-medium text-gray-700">{q.question}</p>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {ADHD_PARENT_RATING_OPTIONS.map((opt) => (
                      <label key={opt.value} className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name={`${assignment.id}-${q.linkId}`}
                          checked={Number(responses[q.linkId]) === opt.value}
                          onChange={() =>
                            updateQuestionnaireResponse(assignment.id, q.linkId, opt.value)
                          }
                          className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleQuestionnaireSubmit(assignment.id, formKey)}
            disabled={submitting === assignment.id}
            className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
          >
            {submitting === assignment.id ? "Submitting…" : "Submit ADHD Parent Rating"}
          </button>
        </div>
      );
    }

    if (formKey === ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY) {
      const renderQuestionList = (
        title: string,
        questions: { linkId: string; question: string }[],
        startIndex: number
      ) => (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy">{title}</h4>
          <ul className="space-y-3">
            {questions.map((q, i) => (
              <li key={q.linkId} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-700">
                  {startIndex + i}. {q.question}
                </p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {ADHD_TEACHER_RATING_OPTIONS.map((opt) => (
                    <label key={opt.value} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${assignment.id}-${q.linkId}`}
                        checked={Number(responses[q.linkId]) === opt.value}
                        onChange={() =>
                          updateQuestionnaireResponse(assignment.id, q.linkId, opt.value)
                        }
                        className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );

      return (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            <strong>Timeframe: Past 6 months.</strong> Response scale:{" "}
            <strong>Never/Rarely</strong>, <strong>Sometimes</strong>, <strong>Often</strong>, or{" "}
            <strong>Very Often</strong>.
          </p>

          {renderQuestionList("Section A: Inattention (Items 1–9)", ADHD_TEACHER_INATTENTION_QUESTIONS, 1)}
          {renderQuestionList(
            "Section B: Hyperactivity / Impulsivity (Items 10–18)",
            ADHD_TEACHER_HYPERACTIVITY_QUESTIONS,
            10
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-navy">Section C: Functional Impact</h4>
            <ul className="space-y-3">
              {ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS.map((q) => (
                <li key={q.linkId} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-medium text-gray-700">{q.question}</p>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {ADHD_TEACHER_RATING_OPTIONS.map((opt) => (
                      <label key={opt.value} className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name={`${assignment.id}-${q.linkId}`}
                          checked={Number(responses[q.linkId]) === opt.value}
                          onChange={() =>
                            updateQuestionnaireResponse(assignment.id, q.linkId, opt.value)
                          }
                          className="h-4 w-4 border-gray-300 text-cta focus:ring-cta"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleQuestionnaireSubmit(assignment.id, formKey)}
            disabled={submitting === assignment.id}
            className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
          >
            {submitting === assignment.id ? "Submitting…" : "Submit ADHD Teacher Rating"}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            How are you feeling today?
          </label>
          <textarea
            value={responses.moodToday || ""}
            onChange={(e) => updateQuestionnaireResponse(assignment.id, "moodToday", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="Describe your current mood and feelings..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Any concerns or questions?
          </label>
          <textarea
            value={responses.concerns || ""}
            onChange={(e) => updateQuestionnaireResponse(assignment.id, "concerns", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="Share any concerns or questions..."
          />
        </div>
        <button
          type="button"
          onClick={() => handleQuestionnaireSubmit(assignment.id, formKey)}
          disabled={submitting === assignment.id}
          className="rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta/90 disabled:opacity-50"
        >
          {submitting === assignment.id ? "Submitting…" : "Submit Questionnaire"}
        </button>
      </div>
    );
  }

  function renderPdfForm(assignment: FormAssignment) {
    return (
      <div className="space-y-4">
        {assignment.downloadUrl && (
          <div>
            <a
              href={assignment.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Template PDF
            </a>
          </div>
        )}
        {assignment.status === "pending" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Completed PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handlePdfUpload(assignment.id, file);
                }
              }}
              disabled={uploading === assignment.id}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cta file:text-white hover:file:bg-cta/90 disabled:opacity-50"
            />
            {uploading === assignment.id && (
              <p className="mt-2 text-sm text-gray-600">Uploading…</p>
            )}
          </div>
        )}
      </div>
    );
  }

  const pendingAssignments = useMemo(
    () => assignments.filter((a) => a.status === "pending" && a.form),
    [assignments]
  );
  const completedAssignments = useMemo(
    () => assignments.filter((a) => a.status === "completed" && a.form),
    [assignments]
  );
  const pendingCount = pendingAssignments.length;
  const completedCount = completedAssignments.length;

  const effectiveExpandedId =
    expandedPendingId && pendingAssignments.some((a) => a.id === expandedPendingId)
      ? expandedPendingId
      : pendingAssignments[0]?.id ?? null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {notice && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`w-full max-w-xl rounded-lg border px-4 py-3 shadow-lg ${
              notice.type === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{notice.message}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-sm opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-4 bg-cream-50 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <p className="mb-2">
          <a
            href="/patient"
            onClick={handleBackToDashboard}
            className="text-sm text-cta hover:underline cursor-pointer"
          >
            ← Back to dashboard
          </a>
        </p>
        <h1 className="section-heading">Forms & Documents</h1>
        <p className="mt-2 text-gray-600">
          Complete the forms assigned by your doctor before booking your next appointment.
        </p>
      </div>

      {pendingCount > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            You have {pendingCount} pending form{pendingCount === 1 ? "" : "s"} to complete.
          </p>
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-gray-500">Loading forms…</p>
      ) : assignments.length === 0 ? (
        <div className="mt-10 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">No forms have been assigned to you yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            After your orientation consult, your doctor will assign forms for you to complete. They will appear here.
          </p>
          <a
            href="/patient"
            onClick={handleBackToDashboard}
            className="mt-4 inline-block text-sm font-medium text-cta hover:underline cursor-pointer"
          >
            ← Back to dashboard
          </a>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {pendingCount > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-navy mb-4">Pending Forms</h2>
              <div className="space-y-4">
                {pendingAssignments.map((assignment) => {
                  const isExpanded = assignment.id === effectiveExpandedId;
                  return (
                    <div key={assignment.id} className="card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-navy">
                            {assignment.form?.title ?? "Untitled"}
                          </h3>
                          {assignment.form?.description && (
                            <p className="mt-1 text-sm text-gray-600">{assignment.form.description}</p>
                          )}
                          {isExpanded ? (
                            <div className="mt-4">
                              {assignment.form?.type === "questionnaire"
                                ? renderQuestionnaireForm(assignment)
                                : renderPdfForm(assignment)}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleExpandPending(assignment.id)}
                              className="mt-3 text-sm font-medium text-cta hover:underline"
                            >
                              Fill out this form →
                            </button>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          Pending
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completedSectionReady && completedCount > 0 && (
            <div
              role="region"
              aria-label="Completed forms"
              onClick={handleCompletedSectionClick}
              className="select-none"
            >
              <h2 className="text-lg font-semibold text-navy mb-4">Completed Forms</h2>
              <div className="space-y-4">
                {completedAssignments.map((assignment) => (
                    <div key={assignment.id} className="card pointer-events-auto">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-navy">
                            {assignment.form?.title ?? "Untitled"}
                          </h3>
                          {assignment.form?.description && (
                            <p className="mt-1 text-sm text-gray-600">{assignment.form.description}</p>
                          )}
                          {assignment.completedAt && (
                            <p className="mt-2 text-xs text-gray-500">
                              Completed on {new Date(assignment.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                          Completed
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
