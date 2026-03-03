/**
 * DSM-Based ADHD Teacher Rating Scale
 * Timeframe: Past 6 months
 * Response scale: 0 = Never/Rarely | 1 = Sometimes | 2 = Often | 3 = Very Often
 */

export const ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY = "adhd_teacher_rating";

export const ADHD_TEACHER_RATING_OPTIONS = [
  { value: 0, label: "Never/Rarely" },
  { value: 1, label: "Sometimes" },
  { value: 2, label: "Often" },
  { value: 3, label: "Very Often" },
] as const;

export const ADHD_TEACHER_INATTENTION_QUESTIONS: { linkId: string; question: string }[] = [
  { linkId: "adhd_teacher_1", question: "Has difficulty sustaining attention during tasks or play." },
  { linkId: "adhd_teacher_2", question: "Makes careless mistakes or overlooks details." },
  { linkId: "adhd_teacher_3", question: "Appears not to listen when spoken to directly." },
  { linkId: "adhd_teacher_4", question: "Starts tasks but does not follow through to completion." },
  { linkId: "adhd_teacher_5", question: "Has difficulty organizing tasks or managing time." },
  { linkId: "adhd_teacher_6", question: "Avoids or resists tasks requiring sustained mental effort." },
  { linkId: "adhd_teacher_7", question: "Frequently loses items needed for activities." },
  { linkId: "adhd_teacher_8", question: "Is easily distracted by external stimuli or unrelated thoughts." },
  { linkId: "adhd_teacher_9", question: "Is forgetful in daily activities." },
] as const;

export const ADHD_TEACHER_HYPERACTIVITY_QUESTIONS: { linkId: string; question: string }[] = [
  { linkId: "adhd_teacher_10", question: "Fidgets with hands or feet or squirms in seat." },
  { linkId: "adhd_teacher_11", question: "Leaves seat when remaining seated is expected." },
  { linkId: "adhd_teacher_12", question: "Runs about or climbs excessively in inappropriate situations." },
  { linkId: "adhd_teacher_13", question: "Has difficulty playing or engaging quietly in activities." },
  { linkId: "adhd_teacher_14", question: "Appears \"on the go\" or acts as if driven by a motor." },
  { linkId: "adhd_teacher_15", question: "Talks excessively." },
  { linkId: "adhd_teacher_16", question: "Blurts out answers before questions are completed." },
  { linkId: "adhd_teacher_17", question: "Has difficulty waiting their turn." },
  { linkId: "adhd_teacher_18", question: "Interrupts or intrudes on others’ activities or conversations." },
] as const;

export const ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS: { linkId: string; question: string }[] = [
  { linkId: "adhd_teacher_impact_classroom", question: "Classroom performance" },
  { linkId: "adhd_teacher_impact_homework", question: "Homework completion" },
  { linkId: "adhd_teacher_impact_peer", question: "Peer relationships" },
  { linkId: "adhd_teacher_impact_rules", question: "Following classroom rules" },
] as const;

export const ADHD_TEACHER_ALL_QUESTIONS = [
  ...ADHD_TEACHER_INATTENTION_QUESTIONS,
  ...ADHD_TEACHER_HYPERACTIVITY_QUESTIONS,
  ...ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS,
] as const;

function num(v: unknown): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : Number(v);
}

function symptomCount(responses: Record<string, unknown>, questions: { linkId: string }[]): number {
  return questions.reduce((count, q) => (num(responses[q.linkId]) >= 2 ? count + 1 : count), 0);
}

function sumScore(responses: Record<string, unknown>, questions: { linkId: string }[]): number {
  return questions.reduce((sum, q) => sum + num(responses[q.linkId]), 0);
}

export function computeADHDTeacherScores(
  responses: Record<string, unknown>,
  patientAgeYears?: number | null
): {
  inattentiveCount: number;
  hyperactiveImpulsiveCount: number;
  inattentiveTotal: number;
  hyperactiveImpulsiveTotal: number;
  overallSeverityTotal: number;
  functionalImpairmentPresent: boolean;
  threshold: { ageGroup: "child_or_teen_upto_16" | "adolescent_17_plus" | "unknown"; symptomsNeeded: number };
  meetsSymptomThreshold: boolean;
} {
  const inattentiveCount = symptomCount(responses, ADHD_TEACHER_INATTENTION_QUESTIONS);
  const hyperactiveImpulsiveCount = symptomCount(responses, ADHD_TEACHER_HYPERACTIVITY_QUESTIONS);

  const inattentiveTotal = sumScore(responses, ADHD_TEACHER_INATTENTION_QUESTIONS);
  const hyperactiveImpulsiveTotal = sumScore(responses, ADHD_TEACHER_HYPERACTIVITY_QUESTIONS);
  const overallSeverityTotal = inattentiveTotal + hyperactiveImpulsiveTotal;

  const functionalImpairmentPresent = ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS.some(
    (q) => num(responses[q.linkId]) >= 2
  );

  let threshold: { ageGroup: "child_or_teen_upto_16" | "adolescent_17_plus" | "unknown"; symptomsNeeded: number };
  if (typeof patientAgeYears === "number" && Number.isFinite(patientAgeYears)) {
    threshold =
      patientAgeYears <= 16
        ? { ageGroup: "child_or_teen_upto_16", symptomsNeeded: 6 }
        : { ageGroup: "adolescent_17_plus", symptomsNeeded: 5 };
  } else {
    threshold = { ageGroup: "unknown", symptomsNeeded: 6 };
  }

  const symptomsNeeded = threshold.symptomsNeeded;
  const meetsSymptomThreshold =
    inattentiveCount >= symptomsNeeded || hyperactiveImpulsiveCount >= symptomsNeeded;

  return {
    inattentiveCount,
    hyperactiveImpulsiveCount,
    inattentiveTotal,
    hyperactiveImpulsiveTotal,
    overallSeverityTotal,
    functionalImpairmentPresent,
    threshold,
    meetsSymptomThreshold,
  };
}

export function adhdTeacherResponseToOptionLabel(value: unknown): string {
  const v = typeof value === "number" ? value : Number(value);
  if (v === 0) return "Never/Rarely";
  if (v === 1) return "Sometimes";
  if (v === 2) return "Often";
  if (v === 3) return "Very Often";
  return "—";
}

