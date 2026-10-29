import { db, must } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { handleError, json } from "@/lib/http";
import { usageToday } from "@/lib/limits";
import { startOfLocalDay } from "@/lib/time";
import type { Profile, SessionSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = { id: string; language: string; country: string | null; status: string; started_at: string; active_seconds: number; summary: SessionSummary | null };

export async function GET() {
  try {
    const settings = await getSettings();
    const now = new Date();
    const todayStart = startOfLocalDay(now, settings.timezone);
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000);

    const [week, recent, profiles, subs, totals, usage] = await Promise.all([
      db().from("tutor_sessions").select("started_at,active_seconds").gte("started_at", weekStart.toISOString()),
      db()
        .from("tutor_sessions")
        .select("id,language,country,status,started_at,active_seconds,summary")
        .order("started_at", { ascending: false })
        .limit(8),
      db().from("tutor_profiles").select("language,level_estimate,difficulties,vocabulary"),
      db().from("tutor_push_subscriptions").select("endpoint", { count: "exact", head: true }),
      db().from("tutor_sessions").select("active_seconds"),
      usageToday(),
    ]);

    const weekRows = must(week) as { started_at: string; active_seconds: number }[];
    const todayRows = weekRows.filter((r) => new Date(r.started_at) >= todayStart);
    const allRows = must(totals) as { active_seconds: number }[];
    const minutes = (rows: { active_seconds: number }[]) => Math.round(rows.reduce((s, r) => s + r.active_seconds, 0) / 60);

    return json({
      settings,
      progress: {
        todayMinutes: minutes(todayRows),
        todaySessions: todayRows.filter((r) => r.active_seconds >= 60).length,
        weekMinutes: minutes(weekRows),
        totalMinutes: minutes(allRows),
        totalSessions: allRows.filter((r) => r.active_seconds >= 60).length,
      },
      profiles: (must(profiles) as Pick<Profile, "language" | "level_estimate" | "difficulties" | "vocabulary">[]).map((p) => ({
        language: p.language,
        level: p.level_estimate,
        difficulties: p.difficulties.slice(0, 5).map((d) => d.item),
        vocabCount: p.vocabulary.length,
      })),
      recent: (must(recent) as Row[]).map((r) => ({
        id: r.id,
        language: r.language,
        country: r.country,
        status: r.status,
        startedAt: r.started_at,
        minutes: Math.round(r.active_seconds / 60),
        summary: r.summary,
      })),
      pushDevices: subs.count ?? 0,
      usage,
    });
  } catch (err) {
    return handleError(err);
  }
}
