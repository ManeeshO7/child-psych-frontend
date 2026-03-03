/**
 * PHQ-A (Adolescent Depression Questionnaire) — form definition and scoring.
 * Over the last 2 weeks. Options: Not at all (0), Several days (1), More than half the days (2), Nearly every day (3).
 * Total score 0–27. Severity: 0–4 Minimal, 5–9 Mild, 10–14 Moderate, 15–19 Moderately severe, 20–27 Severe.
 */

export const PHQA_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
] as const;

export const PHQA_FUNCTIONAL_IMPAIRMENT_OPTIONS = [
  { value: 0, label: "Not difficult at all" },
  { value: 1, label: "Somewhat difficult" },
  { value: 2, label: "Very difficult" },
  { value: 3, label: "Extremely difficult" },
] as const;

export type PHQAResponse = Record<string, number>;

export const PHQA_QUESTIONS: { linkId: string; question: string }[] = [
  { linkId: "phqa_1", question: "Little interest or pleasure in doing things" },
  { linkId: "phqa_2", question: "Feeling down, depressed, or hopeless" },
  { linkId: "phqa_3", question: "Trouble falling asleep, staying asleep, or sleeping too much" },
  { linkId: "phqa_4", question: "Feeling tired or having little energy" },
  { linkId: "phqa_5", question: "Poor appetite, weight loss, or overeating" },
  {
    linkId: "phqa_6",
    question:
      "Feeling bad about yourself — or feeling like you are a failure or have let yourself or your family down",
  },
  {
    linkId: "phqa_7",
    question: "Trouble concentrating on things (such as schoolwork, reading, or watching TV)",
  },
  {
    linkId: "phqa_8",
    question: "Moving or speaking slowly so others notice; OR being fidgety/restless",
  },
  {
    linkId: "phqa_9",
    question: "Thoughts that you would be better off dead or of hurting yourself",
  },
];

export const PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION = {
  linkId: "phqa_functional_impairment",
  question:
    "If you checked off any problems, how difficult have these problems made it for you to do your schoolwork, take care of things at home, or get along with other people?",
} as const;

export function computePHQAScores(responses: Record<string, unknown>): {
  total: number;
  severity: string;
  severityLabel: string;
  suicideSafetyTrigger: boolean;
  functionalImpairment: number | null;
} {
  const num = (v: unknown): number => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v));
  const total = PHQA_QUESTIONS.reduce((sum, q) => sum + num(responses[q.linkId]), 0);
  const suicideSafetyTrigger = num(responses.phqa_9) >= 1;
  const functionalImpairmentRaw = responses[PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION.linkId];
  const functionalImpairmentNum = num(functionalImpairmentRaw);
  const functionalImpairment =
    Number.isFinite(functionalImpairmentNum) &&
    functionalImpairmentNum >= 0 &&
    functionalImpairmentNum <= 3
      ? functionalImpairmentNum
      : null;

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

  return { total, severity, severityLabel, suicideSafetyTrigger, functionalImpairment };
}

export const PHQA_QUESTIONNAIRE_KEY = "phqa";

export function phqaResponseToOptionLabel(value: unknown): string {
  const v = typeof value === "number" ? value : Number(value);
  if (v === 0) return "Not at all";
  if (v === 1) return "Several days";
  if (v === 2) return "More than half the days";
  if (v === 3) return "Nearly every day";
  return "—";
}

export function phqaFunctionalImpairmentToOptionLabel(value: unknown): string {
  const v = typeof value === "number" ? value : Number(value);
  if (v === 0) return "Not difficult at all";
  if (v === 1) return "Somewhat difficult";
  if (v === 2) return "Very difficult";
  if (v === 3) return "Extremely difficult";
  return "—";
}
