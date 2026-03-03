/**
 * PHQ-9 (Adults 18+) — form definition and scoring.
 * Timeframe: past 2 weeks. Options:
 * 0 = Not at all, 1 = Several days, 2 = More than half the days, 3 = Nearly every day.
 */

export const PHQ9_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
] as const;

export const PHQ9_QUESTIONNAIRE_KEY = "phq9";

export const PHQ9_QUESTIONS: { linkId: string; question: string }[] = [
  { linkId: "phq9_1", question: "Little interest or pleasure in doing things" },
  { linkId: "phq9_2", question: "Feeling down, depressed, or hopeless" },
  { linkId: "phq9_3", question: "Trouble falling or staying asleep, or sleeping too much" },
  { linkId: "phq9_4", question: "Feeling tired or having little energy" },
  { linkId: "phq9_5", question: "Poor appetite or overeating" },
  {
    linkId: "phq9_6",
    question:
      "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  },
  { linkId: "phq9_7", question: "Trouble concentrating on things (e.g., reading, work, watching TV)" },
  { linkId: "phq9_8", question: "Moving or speaking slowly; OR being fidgety/restless" },
  {
    linkId: "phq9_9",
    question: "Thoughts that you would be better off dead or of hurting yourself in some way",
  },
];

export function computePHQ9Scores(responses: Record<string, unknown>): {
  total: number;
  severity: string;
  severityLabel: string;
  suicideSafetyTrigger: boolean;
} {
  const num = (v: unknown): number => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v));
  const total = PHQ9_QUESTIONS.reduce((sum, q) => sum + num(responses[q.linkId]), 0);
  const suicideSafetyTrigger = num(responses.phq9_9) >= 1;

  let severity: string;
  let severityLabel: string;
  if (total <= 4) {
    severity = "minimal";
    severityLabel = "Minimal";
  } else if (total <= 9) {
    severity = "mild";
    severityLabel = "Mild";
  } else if (total <= 14) {
    severity = "moderate";
    severityLabel = "Moderate";
  } else if (total <= 19) {
    severity = "moderately_severe";
    severityLabel = "Moderately Severe";
  } else {
    severity = "severe";
    severityLabel = "Severe";
  }

  return { total, severity, severityLabel, suicideSafetyTrigger };
}

export function phq9ResponseToOptionLabel(value: unknown): string {
  const v = typeof value === "number" ? value : Number(value);
  if (v === 0) return "Not at all";
  if (v === 1) return "Several days";
  if (v === 2) return "More than half the days";
  if (v === 3) return "Nearly every day";
  return "—";
}

