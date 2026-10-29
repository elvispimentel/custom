// Datas e horas no fuso escolhido (padrão America/Sao_Paulo).

export const DEFAULT_TZ = "America/Sao_Paulo";

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function localParts(date: Date, tz: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** Início do dia local (em UTC) para consultas "hoje". */
export function startOfLocalDay(date: Date, tz: string): Date {
  const { date: ymd } = localParts(date, tz);
  // Procura o instante em que a data local muda; robusto a horário de verão.
  let guess = new Date(`${ymd}T00:00:00Z`);
  for (let i = 0; i < 3; i++) {
    const offsetMin = tzOffsetMinutes(guess, tz);
    guess = new Date(Date.parse(`${ymd}T00:00:00Z`) - offsetMin * 60000);
  }
  return guess;
}

function tzOffsetMinutes(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}
