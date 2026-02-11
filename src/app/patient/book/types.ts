/**
 * URL slugs for the 4 appointment-type screens.
 * Each type has its own screen so visibility can be controlled per type (e.g. only show certain links).
 */
export const BOOK_TYPE_SLUGS = [
  "orientation",
  "clinical-intake",
  "followup-30",
  "followup-45",
] as const;

export type BookTypeSlug = (typeof BOOK_TYPE_SLUGS)[number];

export const SLUG_TO_TYPE: Record<BookTypeSlug, string> = {
  orientation: "orientation_consult",
  "clinical-intake": "clinical_intake",
  "followup-30": "followup_med_30",
  "followup-45": "followup_med_therapy_45",
};

export function slugToType(slug: string): string | null {
  return SLUG_TO_TYPE[slug as BookTypeSlug] ?? null;
}

export function typeToSlug(type: string): BookTypeSlug | null {
  const entry = Object.entries(SLUG_TO_TYPE).find(([, t]) => t === type);
  return entry ? (entry[0] as BookTypeSlug) : null;
}
