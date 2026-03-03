/**
 * SCARED - Parent Version form definition and scoring.
 * Timeframe: Past 3 months.
 * Response scale: 0 = Not true, 1 = Somewhat true, 2 = Very true.
 */

export const SCARED_PARENT_QUESTIONNAIRE_KEY = "scared_parent";

export const SCARED_PARENT_OPTIONS = [
  { value: 0, label: "Not true" },
  { value: 1, label: "Somewhat true" },
  { value: 2, label: "Very true" },
] as const;

export const SCARED_PARENT_QUESTIONS: { linkId: string; question: string }[] = [
  { linkId: "scared_parent_1", question: "When my child feels frightened, it is hard to breathe." },
  { linkId: "scared_parent_2", question: "My child gets headaches when at school." },
  { linkId: "scared_parent_3", question: "My child does not like to be with people my child does not know well." },
  { linkId: "scared_parent_4", question: "My child gets scared if sleeping away from home." },
  { linkId: "scared_parent_5", question: "My child worries about other people liking my child." },
  { linkId: "scared_parent_6", question: "When frightened, my child feels like passing out." },
  { linkId: "scared_parent_7", question: "My child is nervous." },
  { linkId: "scared_parent_8", question: "My child follows a parent wherever they go." },
  { linkId: "scared_parent_9", question: "People tell me that my child looks nervous." },
  { linkId: "scared_parent_10", question: "My child feels nervous with people my child does not know well." },
  { linkId: "scared_parent_11", question: "My child gets stomachaches at school." },
  { linkId: "scared_parent_12", question: "When frightened, my child feels like going crazy." },
  { linkId: "scared_parent_13", question: "My child worries about sleeping alone." },
  { linkId: "scared_parent_14", question: "My child worries about being as good as other kids." },
  { linkId: "scared_parent_15", question: "When frightened, my child feels like things are not real." },
  {
    linkId: "scared_parent_16",
    question: "My child has nightmares about something bad happening to parents.",
  },
  { linkId: "scared_parent_17", question: "My child worries about going to school." },
  { linkId: "scared_parent_18", question: "When frightened, my child's heart beats fast." },
  { linkId: "scared_parent_19", question: "My child gets shaky." },
  {
    linkId: "scared_parent_20",
    question: "My child has nightmares about something bad happening to my child.",
  },
  { linkId: "scared_parent_21", question: "My child worries about things working out." },
  { linkId: "scared_parent_22", question: "When frightened, my child sweats a lot." },
  { linkId: "scared_parent_23", question: "My child is a worrier." },
  { linkId: "scared_parent_24", question: "My child gets really frightened for no reason at all." },
  { linkId: "scared_parent_25", question: "My child is afraid to be alone in the house." },
  {
    linkId: "scared_parent_26",
    question: "It is hard for my child to talk with people my child does not know well.",
  },
  { linkId: "scared_parent_27", question: "When frightened, my child feels like choking." },
  { linkId: "scared_parent_28", question: "People tell me that my child worries too much." },
  { linkId: "scared_parent_29", question: "My child does not like to be away from family." },
  { linkId: "scared_parent_30", question: "My child is afraid of having anxiety (or panic) attacks." },
  {
    linkId: "scared_parent_31",
    question: "My child worries that something bad might happen to parents.",
  },
  { linkId: "scared_parent_32", question: "My child feels shy." },
  { linkId: "scared_parent_33", question: "My child worries about what is going to happen in the future." },
  { linkId: "scared_parent_34", question: "When frightened, my child feels like throwing up." },
  { linkId: "scared_parent_35", question: "My child worries about how well my child does things." },
  { linkId: "scared_parent_36", question: "My child is scared to go to school." },
  { linkId: "scared_parent_37", question: "My child worries about things that have already happened." },
  { linkId: "scared_parent_38", question: "When frightened, my child feels dizzy." },
  {
    linkId: "scared_parent_39",
    question: "My child feels nervous when my child has to do something while others are watching.",
  },
  {
    linkId: "scared_parent_40",
    question: "My child feels nervous going to places where my child does not know many people.",
  },
  { linkId: "scared_parent_41", question: "My child is shy." },
];

const PANIC_SOMATIC_ITEMS = [1, 6, 12, 15, 18, 19, 22, 24, 27, 30, 34, 38];
const GENERALIZED_ANXIETY_ITEMS = [7, 14, 21, 23, 28, 33, 35, 37];
const SEPARATION_ANXIETY_ITEMS = [4, 8, 13, 16, 20, 25, 29, 31];
const SOCIAL_ANXIETY_ITEMS = [3, 5, 10, 26, 32, 39, 40, 41];
const SCHOOL_AVOIDANCE_ITEMS = [2, 11, 17, 36];

const itemToLinkId = (itemNo: number) => `scared_parent_${itemNo}`;

export function computeScaredParentScores(responses: Record<string, unknown>): {
  total: number;
  clinicallySignificantAnxiety: boolean;
  panicSomatic: number;
  generalizedAnxiety: number;
  separationAnxiety: number;
  socialAnxiety: number;
  schoolAvoidance: number;
} {
  const num = (v: unknown): number => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v));
  const total = SCARED_PARENT_QUESTIONS.reduce((sum, q) => sum + num(responses[q.linkId]), 0);
  const subscale = (items: number[]) =>
    items.reduce((sum, itemNo) => sum + num(responses[itemToLinkId(itemNo)]), 0);

  const panicSomatic = subscale(PANIC_SOMATIC_ITEMS);
  const generalizedAnxiety = subscale(GENERALIZED_ANXIETY_ITEMS);
  const separationAnxiety = subscale(SEPARATION_ANXIETY_ITEMS);
  const socialAnxiety = subscale(SOCIAL_ANXIETY_ITEMS);
  const schoolAvoidance = subscale(SCHOOL_AVOIDANCE_ITEMS);

  return {
    total,
    clinicallySignificantAnxiety: total >= 25,
    panicSomatic,
    generalizedAnxiety,
    separationAnxiety,
    socialAnxiety,
    schoolAvoidance,
  };
}

export function scaredParentResponseToOptionLabel(value: unknown): string {
  const v = typeof value === "number" ? value : Number(value);
  if (v === 0) return "Not true";
  if (v === 1) return "Somewhat true";
  if (v === 2) return "Very true";
  return "—";
}

