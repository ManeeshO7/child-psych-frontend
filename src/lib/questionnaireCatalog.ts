// Read-only catalog for displaying a questionnaire's questions/options to a doctor
// (e.g. in the Forms management tab). Scoring logic lives separately per form in
// phq9.ts, scaredChild.ts, etc. — this file only maps questionnaireKey -> display data.
import { PHQ9_QUESTIONNAIRE_KEY, PHQ9_QUESTIONS, PHQ9_OPTIONS } from "./phq9";
import { PHQA_QUESTIONNAIRE_KEY, PHQA_QUESTIONS, PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION, PHQA_OPTIONS, PHQA_FUNCTIONAL_IMPAIRMENT_OPTIONS } from "./phqa";
import { SCARED_CHILD_QUESTIONNAIRE_KEY, SCARED_CHILD_QUESTIONS, SCARED_CHILD_OPTIONS } from "./scaredChild";
import { SCARED_PARENT_QUESTIONNAIRE_KEY, SCARED_PARENT_QUESTIONS, SCARED_PARENT_OPTIONS } from "./scaredParent";
import {
  ADHD_PARENT_RATING_QUESTIONNAIRE_KEY,
  ADHD_PARENT_INATTENTION_QUESTIONS,
  ADHD_PARENT_HYPERACTIVITY_QUESTIONS,
  ADHD_PARENT_FUNCTIONAL_IMPACT_QUESTIONS,
  ADHD_PARENT_RATING_OPTIONS,
} from "./adhdParentRating";
import {
  ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY,
  ADHD_TEACHER_INATTENTION_QUESTIONS,
  ADHD_TEACHER_HYPERACTIVITY_QUESTIONS,
  ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS,
  ADHD_TEACHER_RATING_OPTIONS,
} from "./adhdTeacherRating";

export type QuestionnaireSection = {
  label?: string;
  questions: { linkId: string; question: string }[];
  options: readonly { value: number; label: string }[];
};

export type QuestionnaireCatalogEntry = {
  timeframe: string;
  sections: QuestionnaireSection[];
};

export const QUESTIONNAIRE_CATALOG: Record<string, QuestionnaireCatalogEntry> = {
  [PHQ9_QUESTIONNAIRE_KEY]: {
    timeframe: "Past 2 weeks",
    sections: [{ questions: PHQ9_QUESTIONS, options: PHQ9_OPTIONS }],
  },
  [PHQA_QUESTIONNAIRE_KEY]: {
    timeframe: "Past 2 weeks",
    sections: [
      { questions: PHQA_QUESTIONS, options: PHQA_OPTIONS },
      { questions: [PHQA_FUNCTIONAL_IMPAIRMENT_QUESTION], options: PHQA_FUNCTIONAL_IMPAIRMENT_OPTIONS },
    ],
  },
  [SCARED_CHILD_QUESTIONNAIRE_KEY]: {
    timeframe: "Past 3 months",
    sections: [{ questions: SCARED_CHILD_QUESTIONS, options: SCARED_CHILD_OPTIONS }],
  },
  [SCARED_PARENT_QUESTIONNAIRE_KEY]: {
    timeframe: "Past 3 months",
    sections: [{ questions: SCARED_PARENT_QUESTIONS, options: SCARED_PARENT_OPTIONS }],
  },
  [ADHD_PARENT_RATING_QUESTIONNAIRE_KEY]: {
    timeframe: "Past 6 months",
    sections: [
      { label: "Inattention", questions: [...ADHD_PARENT_INATTENTION_QUESTIONS], options: ADHD_PARENT_RATING_OPTIONS },
      { label: "Hyperactivity / Impulsivity", questions: [...ADHD_PARENT_HYPERACTIVITY_QUESTIONS], options: ADHD_PARENT_RATING_OPTIONS },
      { label: "Functional impact", questions: [...ADHD_PARENT_FUNCTIONAL_IMPACT_QUESTIONS], options: ADHD_PARENT_RATING_OPTIONS },
    ],
  },
  [ADHD_TEACHER_RATING_QUESTIONNAIRE_KEY]: {
    timeframe: "Past 6 months",
    sections: [
      { label: "Inattention", questions: [...ADHD_TEACHER_INATTENTION_QUESTIONS], options: ADHD_TEACHER_RATING_OPTIONS },
      { label: "Hyperactivity / Impulsivity", questions: [...ADHD_TEACHER_HYPERACTIVITY_QUESTIONS], options: ADHD_TEACHER_RATING_OPTIONS },
      { label: "Functional impact", questions: [...ADHD_TEACHER_FUNCTIONAL_IMPACT_QUESTIONS], options: ADHD_TEACHER_RATING_OPTIONS },
    ],
  },
};
