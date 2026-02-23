/**
 * Pediatric Symptom Checklist (PSC-17) — form definition and scoring.
 * Options: Never = 0, Sometimes = 1, Often = 2.
 * Total score < 15 = negative screen; ≥ 15 = positive screen.
 * Subscale cutoffs: Internalizing ≥ 5, Attention ≥ 7, Externalizing ≥ 7.
 */

export const PSC17_OPTIONS = [
  { value: 0, label: "Never" },
  { value: 1, label: "Sometimes" },
  { value: 2, label: "Often" },
] as const;

export type PSC17Response = Record<string, number>;

export const PSC17_QUESTIONS: {
  linkId: string;
  question: string;
  subscale: "internalizing" | "attention" | "externalizing";
}[] = [
  { linkId: "internalizing_1", question: "Feels sad or unhappy", subscale: "internalizing" },
  { linkId: "internalizing_2", question: "Feels hopeless", subscale: "internalizing" },
  { linkId: "internalizing_3", question: "Is down on himself or herself", subscale: "internalizing" },
  { linkId: "internalizing_4", question: "Worries a lot", subscale: "internalizing" },
  { linkId: "internalizing_5", question: "Seems to be having less fun", subscale: "internalizing" },
  { linkId: "attention_1", question: "Has trouble concentrating", subscale: "attention" },
  { linkId: "attention_2", question: "Is easily distracted", subscale: "attention" },
  { linkId: "attention_3", question: "Daydreams too much", subscale: "attention" },
  { linkId: "attention_4", question: "Acts as if driven by a motor", subscale: "attention" },
  { linkId: "attention_5", question: "Has trouble staying organized", subscale: "attention" },
  { linkId: "externalizing_1", question: "Fights with others", subscale: "externalizing" },
  { linkId: "externalizing_2", question: "Does not listen to rules", subscale: "externalizing" },
  { linkId: "externalizing_3", question: "Does not understand other people's feelings", subscale: "externalizing" },
  { linkId: "externalizing_4", question: "Teases others", subscale: "externalizing" },
  { linkId: "externalizing_5", question: "Blames others for his or her troubles", subscale: "externalizing" },
  { linkId: "externalizing_6", question: "Takes things that do not belong to him or her", subscale: "externalizing" },
  { linkId: "externalizing_7", question: "Refuses to share", subscale: "externalizing" },
];

const INTERNALIZING_IDS = PSC17_QUESTIONS.filter((q) => q.subscale === "internalizing").map((q) => q.linkId);
const ATTENTION_IDS = PSC17_QUESTIONS.filter((q) => q.subscale === "attention").map((q) => q.linkId);
const EXTERNALIZING_IDS = PSC17_QUESTIONS.filter((q) => q.subscale === "externalizing").map((q) => q.linkId);

export function computePSC17Scores(responses: Record<string, unknown>): {
  total: number;
  internalizing: number;
  attention: number;
  externalizing: number;
  totalInterpretation: string;
  internalizingInterpretation: string | null;
  attentionInterpretation: string | null;
  externalizingInterpretation: string | null;
} {
  const num = (v: unknown): number => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v));
  const internalizing = INTERNALIZING_IDS.reduce((sum, id) => sum + num(responses[id]), 0);
  const attention = ATTENTION_IDS.reduce((sum, id) => sum + num(responses[id]), 0);
  const externalizing = EXTERNALIZING_IDS.reduce((sum, id) => sum + num(responses[id]), 0);
  const total = internalizing + attention + externalizing;

  return {
    total,
    internalizing,
    attention,
    externalizing,
    totalInterpretation: total < 15 ? "Negative screen" : "Positive screen — further evaluation needed",
    internalizingInterpretation: internalizing >= 5 ? "Possible anxiety/depression" : null,
    attentionInterpretation: attention >= 7 ? "Possible ADHD" : null,
    externalizingInterpretation: externalizing >= 7 ? "Behavior concerns" : null,
  };
}

export const PSC17_QUESTIONNAIRE_KEY = "psc17";

export function psc17ResponseToOptionLabel(value: unknown): string {
  const v = typeof value === "number" ? value : Number(value);
  if (v === 0) return "Never";
  if (v === 1) return "Sometimes";
  if (v === 2) return "Often";
  return "—";
}
