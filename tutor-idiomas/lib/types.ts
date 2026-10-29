export type Language = "en" | "es";
export type Country = "AR" | "BO" | "PY" | "UY";

export const COUNTRIES: Record<Country, string> = {
  AR: "Argentina",
  BO: "Bolívia",
  PY: "Paraguai",
  UY: "Uruguai",
};

export const LANGUAGE_NAMES: Record<Language, string> = { en: "Inglês", es: "Espanhol" };

export type Reminder = { slot: string; hour: number; language: Language; enabled: boolean };

export type Settings = {
  timezone: string;
  paused: boolean;
  session_minutes: number;
  reminders: Reminder[];
  country: Country;
};

export type Correction = { original: string; natural: string; note_pt: string };

export type TutorTurn = {
  reply: string;
  translation_pt: string;
  correction: Correction | null;
  recognition_doubt: boolean;
};

export type SessionSummary = {
  resumo: string;
  praticado: string[];
  melhorar: string[];
  retomar: string[];
  nivel_estimado: string;
};

export type Difficulty = { item: string; count: number; last: string };
export type Vocab = { term: string; meaning_pt: string; last: string };

export type Profile = {
  language: Language;
  level_estimate: string | null;
  notes: string | null;
  difficulties: Difficulty[];
  vocabulary: Vocab[];
};

export function isLanguage(v: unknown): v is Language {
  return v === "en" || v === "es";
}

export function isCountry(v: unknown): v is Country {
  return typeof v === "string" && v in COUNTRIES;
}
