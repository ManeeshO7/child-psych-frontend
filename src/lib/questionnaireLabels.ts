/**
 * Map pre-screening questionnaire form keys to the question text shown to the patient.
 * Used on the doctor portal to display responses as "Question: Answer".
 */
export const QUESTIONNAIRE_LABELS: Record<string, string> = {
  childAge: "1. Child/patient age",
  childLocation: "2. Child's current location (state/country where visits will occur)",
  legalGuardian: "3. Are you the child's legal guardian authorized to consent to psychiatric care?",
  primaryConcerns: "4. What are the primary concerns you are seeking help for? (Select all that apply)",
  otherConcern: "4. Other concern (specify)",
  mainConcernsBrief: "5. Briefly describe your main concerns (1–2 sentences)",
  suicideSelfHarm30Days: "6. In the past 30 days — Thoughts of suicide or self-harm?",
  suicideAttempts30Days: "6. In the past 30 days — Suicide attempts or self-injurious behavior?",
  harmOthers30Days: "6. In the past 30 days — Thoughts of harming others?",
  recentHospitalization3Mo:
    "7. Recent psychiatric hospitalization, ER visits, or crisis interventions in the past 3 months?",
  hospitalizationExplain: "7. If Yes to above, please briefly explain",
  currentlySeeingPsychiatrist: "8. Is your child currently seeing a psychiatrist?",
  currentlySeeingTherapist: "8. Is your child currently seeing a therapist/counselor?",
  currentlyTakingMeds: "9. Is your child currently taking psychiatric medication?",
  previousDiagnosis:
    "10. Has your child previously been diagnosed with any psychiatric or neurodevelopmental conditions?",
  previousDiagnosisList: "10. If yes, please list",
  reliableInternet: "11. Reliable internet access for video visits?",
  privateSpace: "11. A private space for sessions?",
  participateFromState: "12. Able to participate in telehealth sessions from the state listed above?",
  comfortableTelehealth: "13. Comfortable with care delivered exclusively via telehealth?",
  understandFeeForService:
    "14. I understand that this is a fee-for-service practice and does not accept insurance.",
  understandNoGuarantee:
    "15. I understand that completion of this form does not guarantee acceptance into the practice.",
  understandOtherCare:
    "16. I understand that this practice may determine that another level or type of care is more appropriate.",
  additionalInfo: "17. Anything else important for us to know when determining fit?",
};

/** Order of keys for consistent display (section order). */
export const QUESTIONNAIRE_KEY_ORDER = [
  "childAge",
  "childLocation",
  "legalGuardian",
  "primaryConcerns",
  "otherConcern",
  "mainConcernsBrief",
  "suicideSelfHarm30Days",
  "suicideAttempts30Days",
  "harmOthers30Days",
  "recentHospitalization3Mo",
  "hospitalizationExplain",
  "currentlySeeingPsychiatrist",
  "currentlySeeingTherapist",
  "currentlyTakingMeds",
  "previousDiagnosis",
  "previousDiagnosisList",
  "reliableInternet",
  "privateSpace",
  "participateFromState",
  "comfortableTelehealth",
  "understandFeeForService",
  "understandNoGuarantee",
  "understandOtherCare",
  "additionalInfo",
];

function formatAnswer(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Convert questionnaire data object into an array of { question, answer } for display.
 */
export function questionnaireToQandA(
  data: Record<string, unknown> | null | undefined
): { question: string; answer: string }[] {
  if (!data || typeof data !== "object") return [];
  const out: { question: string; answer: string }[] = [];
  const keys = QUESTIONNAIRE_KEY_ORDER.filter((k) => data[k] !== undefined && data[k] !== "");
  for (const key of keys) {
    const question = QUESTIONNAIRE_LABELS[key] || key;
    const answer = formatAnswer(data[key]);
    out.push({ question, answer });
  }
  // Include any keys not in the order (e.g. from older forms)
  for (const key of Object.keys(data)) {
    if (QUESTIONNAIRE_KEY_ORDER.includes(key)) continue;
    out.push({ question: QUESTIONNAIRE_LABELS[key] || key, answer: formatAnswer(data[key]) });
  }
  return out;
}
