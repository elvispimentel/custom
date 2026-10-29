"use client";

import { useCallback, useEffect, useState } from "react";
import SessionView, { type SessionInfo } from "./SessionView";
import SettingsView from "./SettingsView";
import { api } from "@/lib/client/api";
import { getPlayer } from "@/lib/client/audio";
import { COUNTRIES, LANGUAGE_NAMES, type Country, type Language, type SessionSummary, type Settings } from "@/lib/types";

export type AppState = {
  settings: Settings;
  progress: { todayMinutes: number; todaySessions: number; weekMinutes: number; totalMinutes: number; totalSessions: number };
  profiles: { language: Language; level: string | null; difficulties: string[]; vocabCount: number }[];
  recent: {
    id: string;
    language: Language;
    country: Country | null;
    status: string;
    startedAt: string;
    minutes: number;
    summary: SessionSummary | null;
  }[];
  pushDevices: number;
};

type View = { name: "home" } | { name: "session"; info: SessionInfo } | { name: "summary"; summary: SessionSummary | null; minutes: number } | { name: "settings" };

const LAST_LANG_KEY = "tutor:idioma";

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>({ name: "home" });
  const [language, setLanguage] = useState<Language>("es");
  const [country, setCountry] = useState<Country>("AR");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<AppState>("/api/state");
      setState(data);
      setCountry(data.settings.country);
      setLoadError("");
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("idioma");
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LAST_LANG_KEY);
    } catch {}
    const initial = fromUrl === "en" || fromUrl === "es" ? fromUrl : saved === "en" || saved === "es" ? saved : null;
    if (initial) setLanguage(initial);
    if (fromUrl) window.history.replaceState(null, "", "/");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [load]);

  function chooseLanguage(lang: Language) {
    setLanguage(lang);
    try {
      localStorage.setItem(LAST_LANG_KEY, lang);
    } catch {}
  }

  async function start() {
    // Precisa acontecer dentro do toque, antes de qualquer espera (regra do iPhone).
    getPlayer().unlock();
    setStarting(true);
    setStartError("");
    try {
      const info = await api<SessionInfo>("/api/session/start", {
        method: "POST",
        body: JSON.stringify({ language, country: language === "es" ? country : null }),
      });
      setView({ name: "session", info });
    } catch (err) {
      setStartError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  if (view.name === "session") {
    return (
      <SessionView
        info={view.info}
        onEnded={(summary, minutes) => {
          setView({ name: "summary", summary, minutes });
          load();
        }}
      />
    );
  }

  if (view.name === "settings" && state) {
    return (
      <SettingsView
        state={state}
        onBack={() => setView({ name: "home" })}
        onChange={(settings) => setState({ ...state, settings })}
        onPushChange={load}
      />
    );
  }

  if (view.name === "summary") {
    return <SummaryView summary={view.summary} minutes={view.minutes} onBack={() => setView({ name: "home" })} />;
  }

  const minutesGoal = state ? state.settings.session_minutes * Math.max(1, state.settings.reminders.filter((r) => r.enabled).length) : 45;
  const today = state?.progress.todayMinutes ?? 0;
  const pct = Math.min(100, Math.round((today / minutesGoal) * 100));
  const profile = state?.profiles.find((p) => p.language === language);

  return (
    <main className="shell">
      <header className="topbar">
        <h1 className="brand">Tutor</h1>
        <button className="ghost" onClick={() => setView({ name: "settings" })} disabled={!state}>
          Lembretes e ajustes
        </button>
      </header>

      {loadError && (
        <div className="card notice" role="alert">
          <p>{loadError}</p>
          <button className="secondary" onClick={load}>
            Tentar de novo
          </button>
        </div>
      )}

      <section className="card today" aria-label="Progresso de hoje">
        <div className="ring" style={{ ["--pct" as string]: `${pct}%` }}>
          <span>{today}</span>
          <small>de {minutesGoal} min</small>
        </div>
        <div>
          <p className="today-title">Hoje</p>
          <p className="muted">
            {state ? `${state.progress.todaySessions} sessão(ões) · ${state.progress.weekMinutes} min nos últimos 7 dias` : "Carregando…"}
          </p>
          {state?.settings.paused && <p className="pill warn">Lembretes pausados</p>}
        </div>
      </section>

      <section className="card stack" aria-label="Nova sessão">
        <div className="segmented" role="radiogroup" aria-label="Idioma">
          {(["es", "en"] as Language[]).map((l) => (
            <button key={l} role="radio" aria-checked={language === l} className={language === l ? "on" : ""} onClick={() => chooseLanguage(l)}>
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>

        {language === "es" && (
          <div className="stack-sm">
            <p className="label">País de contexto</p>
            <div className="chips">
              {(Object.keys(COUNTRIES) as Country[]).map((c) => (
                <button key={c} className={`chip ${country === c ? "on" : ""}`} aria-pressed={country === c} onClick={() => setCountry(c)}>
                  {COUNTRIES[c]}
                </button>
              ))}
            </div>
            <p className="hint">Vocabulário, tratamento e situações seguem o país. A voz é sintetizada e pode não reproduzir o sotaque local.</p>
          </div>
        )}

        <p className="muted">
          {profile?.level ? `Nível estimado: ${profile.level}` : "Primeira conversa neste idioma: começa com uma avaliação informal, por conversa."}
          {profile?.difficulties.length ? ` · Trabalhando: ${profile.difficulties.slice(0, 3).join(", ")}` : ""}
        </p>

        <button className="primary big" onClick={start} disabled={starting || !state}>
          {starting ? "Preparando o tutor…" : `Começar meus ${state?.settings.session_minutes ?? 15} minutos`}
        </button>
        {startError && (
          <p className="error" role="alert">
            {startError}
          </p>
        )}
      </section>

      {state && state.recent.length > 0 && (
        <section className="stack-sm" aria-label="Sessões recentes">
          <h2>Sessões recentes</h2>
          {state.recent.map((s) => (
            <details key={s.id} className="card session-item">
              <summary>
                <span>
                  {new Date(s.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: state.settings.timezone })} ·{" "}
                  {LANGUAGE_NAMES[s.language]}
                  {s.country ? ` (${COUNTRIES[s.country]})` : ""}
                </span>
                <span className="muted">{s.minutes} min</span>
              </summary>
              {s.summary ? <SummaryBody summary={s.summary} /> : <p className="muted">{s.status === "open" ? "Em andamento ou não encerrada." : "Sem resumo (pouca conversa)."}</p>}
            </details>
          ))}
        </section>
      )}

      {state && (
        <p className="footnote">
          Total: {state.progress.totalSessions} sessões · {state.progress.totalMinutes} min praticados
        </p>
      )}
    </main>
  );
}

function SummaryBody({ summary }: { summary: SessionSummary }) {
  return (
    <div className="stack-sm summary-body">
      <p>{summary.resumo}</p>
      {summary.praticado.length > 0 && <List title="Praticou" items={summary.praticado} />}
      {summary.melhorar.length > 0 && <List title="Para melhorar" items={summary.melhorar} />}
      {summary.retomar.length > 0 && <List title="Retomar depois" items={summary.retomar} />}
      {summary.nivel_estimado && <p className="muted">Nível estimado: {summary.nivel_estimado}</p>}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="label">{title}</p>
      <ul>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function SummaryView({ summary, minutes, onBack }: { summary: SessionSummary | null; minutes: number; onBack: () => void }) {
  return (
    <main className="shell">
      <header className="topbar">
        <h1 className="brand">Sessão encerrada</h1>
      </header>
      <section className="card stack">
        <p className="today-title">{minutes} min praticados</p>
        {summary ? <SummaryBody summary={summary} /> : <p className="muted">A conversa foi curta demais para um resumo. O tempo foi registrado.</p>}
        <button className="primary" onClick={onBack}>
          Voltar ao início
        </button>
      </section>
    </main>
  );
}
