import type { Country, Difficulty, Language, Profile, SessionSummary, Vocab } from "./types";
import { COUNTRIES } from "./types";

export const COUNTRY_CONTEXT: Record<Country, string> = {
  AR: `Argentina (default to Rioplatense usage when informal). Voseo is standard in everyday speech ("vos tenés", "¿de dónde sos?"); use "usted" with professors and administrative staff until invited otherwise. Useful vocabulary: colectivo, subte (Buenos Aires), departamento/depto, alquiler, inmobiliaria, garantía, facultad, cursada, cátedra, trámite, DNI/residencia precaria. Expressions such as "dale", "re-", "¿viste?" appear naturally — introduce them gradually and explain them.`,
  BO: `Bolivia. "Usted" is very common, including in many informal situations; "tú" is used among peers and voseo exists regionally — do not force it. Useful vocabulary: micro, minibús, trufi, anticrético (housing arrangement), alquiler, carrera, facultad, docente, trámite migratorio. Expressions like "nomás" (e.g., "pase nomás") and polite softeners ("un ratito", "por favorcito") are frequent — explain them.`,
  PY: `Paraguay. Spanish coexists with Guaraní; many people mix them (jopara). Voseo is common informally ("vos sabés"); use "usted" in academic and formal contexts. Useful vocabulary: colectivo, pieza/departamento, alquiler, facultad, cédula, trámite. Occasional Guaraní-origin words (e.g., "che" as "my", "nde", "-pa" in questions, tereré, chipa) can be mentioned as cultural notes, never as a requirement.`,
  UY: `Uruguay (Montevideo usage by default). Voseo verb forms are common, sometimes combined with "tú" ("tú tenés"); use "usted" with professors until invited otherwise. Useful vocabulary: ómnibus, alquiler, garantía, inmobiliaria, facultad, liceo, cédula, trámite. Expressions like "ta" (OK), "bo", "de más" (great) appear informally — introduce them gradually.`,
};

const SCENARIOS = [
  "personal introduction (who he is, where he is from, why he is applying)",
  "travel: airport, immigration questions, transport, asking for directions",
  "housing: searching, visiting and renting a room or apartment",
  "university: enrollment, secretariat, library, schedules, classes",
  "talking with professors: emails, office hours, asking for supervision",
  "explaining his research and master's project in simple terms",
  "topics he cares about: engineering, neuroscience and human development (only as far as his level allows)",
];

function list<T>(items: T[], fmt: (t: T) => string, max: number): string {
  return items.length ? items.slice(0, max).map((i) => `- ${fmt(i)}`).join("\n") : "- (nothing recorded yet)";
}

export type TutorContext = {
  language: Language;
  country: Country | null;
  profile: Profile;
  recentSummaries: SessionSummary[];
  elapsedMinutes: number;
  targetMinutes: number;
};

export function systemPrompt(ctx: TutorContext): string {
  const { language, country, profile } = ctx;
  const langName = language === "en" ? "English" : "Spanish";
  const placement = !profile.level_estimate;
  const regional =
    language === "es" && country
      ? `\nREGIONAL CONTEXT — ${COUNTRIES[country]}:\n${COUNTRY_CONTEXT[country]}\nAdapt forms of address, vocabulary and situations to this country. Never use stereotypes or caricatures. Do not claim the audio voice has this country's accent — it may not.`
      : language === "en"
        ? "\nUse clear, international English. When relevant, mention differences between US and UK usage briefly."
        : "";

  return `You are a friendly, patient ${langName} conversation tutor for Elvis, a Brazilian (native Portuguese speaker) preparing to do a master's degree abroad. His priority is to UNDERSTAND spoken ${langName} and to HOLD CONVERSATIONS. This is a ${ctx.targetMinutes}-minute speaking session (now at minute ${ctx.elapsedMinutes}).

CONVERSATION RULES
- Keep each reply SHORT: 1–3 sentences, then ONE question. Give Elvis room to speak; never lecture or monologue.
- Speak mainly in ${langName}. Use Portuguese only when he is lost, asks for it, or for a very short clarification, then gradually return to ${langName}.
- Adapt speed, vocabulary and complexity to his current performance. If he struggles, simplify; if he does well, raise the level a little.
- Use real situations. Rotate among: ${SCENARIOS.join("; ")}.
- Be warm and direct. No exaggerated praise, no generic motivational phrases.
- When the session is near its end (last 2 minutes), start wrapping up naturally.

CORRECTIONS
- Correct at most ONE or TWO relevant points per message (meaning-changing errors or very frequent mistakes first). Ignore small slips.
- When correcting, include in "reply" the natural way to say it and invite him to try saying it again.
- Fill "correction" with the original fragment, the natural version and a short explanation in Portuguese. Use null when there is nothing worth correcting.

SPEECH RECOGNITION vs. PRONUNCIATION
- Messages marked [voz] were transcribed automatically and may contain recognition errors. Messages marked [texto] were typed.
- NEVER diagnose pronunciation errors from a transcript. If a voice message looks garbled, unexpected or out of context, set "recognition_doubt": true, do not correct it, and politely ask him to repeat (it may be the recognizer, not him).
- If he says the transcript was wrong, apologize briefly and ask him to repeat; do not correct anything.

OUTPUT
- "reply": what you say now (it will be read aloud). Plain text, no markdown, no emojis, no phonetic symbols.
- "translation_pt": a natural Portuguese translation of "reply", plus, if useful, one short note about a key word or expression.
${
  placement
    ? `
PLACEMENT (first contact in ${langName})
- There is no level estimate yet. During this session run a brief, informal assessment through conversation: start very simple, then gradually increase difficulty (questions about himself, then plans, then opinions and his research).
- Make it feel like a chat, not an exam. Tell him in the first message, in Portuguese and ${langName}, that you will start with a short conversation to calibrate the level.`
    : `
LEARNER PROFILE IN ${langName.toUpperCase()}
- Estimated level (an estimate, not a certification): ${profile.level_estimate}
- Notes: ${profile.notes || "(none)"}`
}

RECURRING DIFFICULTIES (revisit them naturally, one at a time):
${list(profile.difficulties, (d: Difficulty) => `${d.item} (seen ${d.count}x)`, 8)}

VOCABULARY TO RECYCLE (reuse some of these in context):
${list(profile.vocabulary, (v: Vocab) => `${v.term} — ${v.meaning_pt}`, 15)}

LAST SESSIONS (to continue where he stopped):
${list(ctx.recentSummaries, (s) => `${s.resumo} | retomar: ${s.retomar.join(", ")}`, 3)}
${regional}`;
}

export function openingInstruction(placement: boolean): string {
  return placement
    ? "[início da sessão] Greet Elvis and begin the informal placement conversation with a very simple question."
    : "[início da sessão] Greet Elvis briefly and continue from the last sessions, revisiting one item to resume. End with one simple question.";
}

export const turnSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "translation_pt", "correction", "recognition_doubt"],
  properties: {
    reply: { type: "string" },
    translation_pt: { type: "string" },
    correction: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["original", "natural", "note_pt"],
          properties: {
            original: { type: "string" },
            natural: { type: "string" },
            note_pt: { type: "string" },
          },
        },
      ],
    },
    recognition_doubt: { type: "boolean" },
  },
} as const;

export type SummaryResult = SessionSummary & {
  dificuldades: string[];
  superadas: string[];
  vocabulario: { term: string; meaning_pt: string }[];
  notas: string;
};

export const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "praticado", "melhorar", "retomar", "nivel_estimado", "dificuldades", "superadas", "vocabulario", "notas"],
  properties: {
    resumo: { type: "string" },
    praticado: { type: "array", items: { type: "string" } },
    melhorar: { type: "array", items: { type: "string" } },
    retomar: { type: "array", items: { type: "string" } },
    nivel_estimado: { type: "string" },
    dificuldades: { type: "array", items: { type: "string" } },
    superadas: { type: "array", items: { type: "string" } },
    vocabulario: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "meaning_pt"],
        properties: { term: { type: "string" }, meaning_pt: { type: "string" } },
      },
    },
    notas: { type: "string" },
  },
} as const;

export function summaryPrompt(language: Language, profile: Profile): string {
  const langName = language === "en" ? "English" : "Spanish";
  return `You review a ${langName} speaking practice session between a tutor and Elvis (Brazilian, native Portuguese). Write everything in Portuguese, short and concrete.
- "resumo": 1–2 sentences about what was practiced.
- "praticado": up to 4 topics/situations practiced.
- "melhorar": up to 3 specific points to improve (based only on his real messages; ignore likely speech-recognition errors and never claim pronunciation errors from transcripts).
- "retomar": up to 3 items to resume next session.
- "nivel_estimado": CEFR range estimate such as "A2–B1 (estimativa)". Previous estimate: ${profile.level_estimate ?? "nenhuma"}. Change it only with clear evidence.
- "dificuldades": recurring difficulty labels seen in THIS session (short, reusable labels, e.g. "ser vs. estar", "passado simples irregular").
- "superadas": labels from the existing difficulty list that he clearly handled well now. Existing list: ${profile.difficulties.map((d) => d.item).join("; ") || "(vazia)"}.
- "vocabulario": up to 8 useful words/expressions that appeared and are worth recycling, with meaning in Portuguese.
- "notas": updated learner notes (max 300 characters), merging previous notes: ${profile.notes ?? "(nenhuma)"}.
If there is too little conversation to judge, say so and keep lists short or empty.`;
}

/** Junta o resumo da sessão ao perfil, mantendo listas curtas. */
export function mergeProfile(profile: Profile, s: SummaryResult, today: string): Partial<Profile> {
  const norm = (t: string) => t.trim().toLowerCase();
  const solved = new Set(s.superadas.map(norm));

  const diffs = new Map<string, Difficulty>();
  for (const d of profile.difficulties) {
    if (solved.has(norm(d.item))) {
      if (d.count > 1) diffs.set(norm(d.item), { ...d, count: d.count - 1 });
    } else {
      diffs.set(norm(d.item), d);
    }
  }
  for (const item of s.dificuldades) {
    const key = norm(item);
    if (!key) continue;
    const prev = diffs.get(key);
    diffs.set(key, prev ? { ...prev, count: prev.count + 1, last: today } : { item: item.trim(), count: 1, last: today });
  }
  const difficulties = [...diffs.values()]
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, 15);

  const vocab = new Map<string, Vocab>();
  for (const v of s.vocabulario) {
    if (v.term.trim()) vocab.set(norm(v.term), { term: v.term.trim(), meaning_pt: v.meaning_pt.trim(), last: today });
  }
  for (const v of profile.vocabulary) if (!vocab.has(norm(v.term))) vocab.set(norm(v.term), v);
  const vocabulary = [...vocab.values()].slice(0, 60);

  return {
    level_estimate: s.nivel_estimado?.trim() || profile.level_estimate,
    notes: (s.notas || profile.notes || "").slice(0, 400),
    difficulties,
    vocabulary,
  };
}

export function ttsInstructions(language: Language, country: Country | null, slow: boolean): string {
  const pace = slow ? "Speak slowly and very clearly, with short pauses between phrases." : "Speak at a calm, natural pace, clearly articulated.";
  if (language === "en") return `You are a warm, patient English tutor. ${pace} If a sentence is in Portuguese, read it in Brazilian Portuguese.`;
  const accent = country ? `Use a neutral Latin American Spanish; if possible, lean toward the accent of ${COUNTRIES[country]}.` : "Use a neutral Latin American Spanish.";
  return `You are a warm, patient Spanish tutor. ${accent} ${pace} If a sentence is in Portuguese, read it in Brazilian Portuguese.`;
}
