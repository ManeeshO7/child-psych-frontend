/**
 * SCARED - Child Version (Ages 8-18) form definition and scoring.
 * Timeframe: Past 3 months.
 * Response scale: 0 = Not true, 1 = Somewhat true, 2 = Very true.
 */

export const SCARED_CHILD_QUESTIONNAIRE_KEY = "scared_child";

export const SCARED_CHILD_OPTIONS = [
  { value: 0, label: "Not true" },
  { value: 1, label: "Somewhat true" },
  { value: 2, label: "Very true" },
] as const;

export const SCARED_CHILD_QUESTIONS: { linkId: string; question: string }[] = [
  { linkId: "scared_child_1", question: "When I feel frightened, it is hard to breathe." },
  { linkId: "scared_child_2", question: "I get headaches when I am at school." },
  { linkId: "scared_child_3", question: "I do not like to be with people I do not know well." },
  { linkId: "scared_child_4", question: "I get scared if I sleep away from home." },
  { linkId: "scared_child_5", question: "I worry about other people liking me." },
  { linkId: "scared_child_6", question: "When I get frightened, I feel like passing out." },
  { linkId: "scared_child_7", question: "I am nervous." },
  { linkId: "scared_child_8", question: "I follow my mother or father wherever they go." },
  { linkId: "scared_child_9", question: "People tell me that I look nervous." },
  { linkId: "scared_child_10", question: "I feel nervous with people I do not know well." },
  { linkId: "scared_child_11", question: "I get stomachaches at school." },
  { linkId: "scared_child_12", question: "When I get frightened, I feel like I am going crazy." },
  { linkId: "scared_child_13", question: "I worry about sleeping alone." },
  { linkId: "scared_child_14", question: "I worry about being as good as other kids." },
  { linkId: "scared_child_15", question: "When I get frightened, I feel like things are not real." },
  {
    linkId: "scared_child_16",
    question: "I have nightmares about something bad happening to my parents.",
  },
  { linkId: "scared_child_17", question: "I worry about going to school." },
  { linkId: "scared_child_18", question: "When I get frightened, my heart beats fast." },
  { linkId: "scared_child_19", question: "I get shaky." },
  {
    linkId: "scared_child_20",
    question: "I have nightmares about something bad happening to me.",
  },
  { linkId: "scared_child_21", question: "I worry about things working out for me." },
  { linkId: "scared_child_22", question: "When I get frightened, I sweat a lot." },
  { linkId: "scared_child_23", question: "I am a worrier." },
  { linkId: "scared_child_24", question: "I get really frightened for no reason at all." },
  { linkId: "scared_child_25", question: "I am afraid to be alone in the house." },
  { linkId: "scared_child_26", question: "It is hard for me to talk with people I do not know well." },
  { linkId: "scared_child_27", question: "When I get frightened, I feel like I am choking." },
  { linkId: "scared_child_28", question: "People tell me that I worry too much." },
  { linkId: "scared_child_29", question: "I do not like to be away from my family." },
  { linkId: "scared_child_30", question: "I am afraid of having anxiety (or panic) attacks." },
  { linkId: "scared_child_31", question: "I worry that something bad might happen to my parents." },
  { linkId: "scared_child_32", question: "I feel shy." },
  { linkId: "scared_child_33", question: "I worry about what is going to happen in the future." },
  { linkId: "scared_child_34", question: "When I get frightened, I feel like throwing up." },
  { linkId: "scared_child_35", question: "I worry about how well I do things." },
  { linkId: "scared_child_36", question: "I am scared to go to school." },
  { linkId: "scared_child_37", question: "I worry about things that have already happened." },
  { linkId: "scared_child_38", question: "When I get frightened, I feel dizzy." },
  {
    linkId: "scared_child_39",
    question: "I feel nervous when I have to do something while others are watching me.",
  },
  {
    linkId: "scared_child_40",
    question: "I feel nervous going to places where I do not know many people.",
  },
  { linkId: "scared_child_41", question: "I am shy." },
];

const PANIC_SOMATIC_ITEMS = [1, 6, 12, 15, 18, 19, 22, 24, 27, 30, 34, 38];
const GENERALIZED_ANXIETY_ITEMS = [7, 14, 21, 23, 28, 33, 35, 37];
const SEPARATION_ANXIETY_ITEMS = [4, 8, 13, 16, 20, 25, 29, 31];
const SOCIAL_ANXIETY_ITEMS = [3, 5, 10, 26, 32, 39, 40, 41];
const SCHOOL_AVOIDANCE_ITEMS = [2, 11, 17, 36];

const itemToLinkId = (itemNo: number) => `scared_child_${itemNo}`;

export function computeScaredChildScores(responses: Record<string, unknown>): {
  total: number;
  clinicallySignificantAnxiety: boolean;
  panicSomatic: number;
  generalizedAnxiety: number;
  separationAnxiety: number;
  socialAnxiety: number;
  schoolAvoidance: number;
} {
  const num = (v: unknown): number => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v));
  const total = SCARED_CHILD_QUESTIONS.reduce((sum, q) => sum + num(responses[q.linkId]), 0);
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

export function scaredChildResponseToOptionLabel(value: unknown): string {
  const v = typeof value === "number" ? value : Number(value);
  if (v === 0) return "Not true";
  if (v === 1) return "Somewhat true";
  if (v === 2) return "Very true";
  return "—";
}

