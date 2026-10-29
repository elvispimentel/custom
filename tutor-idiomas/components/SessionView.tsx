"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { getPlayer, micErrorKind, Recorder, type MicError } from "@/lib/client/audio";
import { COUNTRIES, LANGUAGE_NAMES, type Correction, type Country, type Language, type SessionSummary, type TutorTurn } from "@/lib/types";

export type SessionInfo = {
  sessionId: string;
  language: Language;
  country: Country | null;
  targetMinutes: number;
  placement: boolean;
  turn: TutorTurn;
};

type Msg = {
  id: number;
  role: "user" | "assistant";
  text: string;
  via?: "voz" | "texto";
  pt?: string;
  correction?: Correction | null;
  doubt?: boolean;
  audioUrl?: string;
  showText?: boolean;
  showPt?: boolean;
  flagged?: boolean;
};

type Status = "idle" | "recording" | "sending" | "voice" | "speaking";

const MAX_RECORD_SECONDS = 110;
const SHOW_TEXT_KEY = "tutor:mostrarTexto";

let nextId = 1;

export default function SessionView({ info, onEnded }: { info: SessionInfo; onEnded: (s: SessionSummary | null, minutes: number) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [micError, setMicError] = useState<MicError | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [goalShown, setGoalShown] = useState(false);
  const [ending, setEnding] = useState(false);
  const [alwaysText, setAlwaysText] = useState(false);
  const [needsTap, setNeedsTap] = useState<number | null>(null);
  const [failed, setFailed] = useState<{ blob?: Blob; seconds?: number; text?: string; kind?: string } | null>(null);
  const [micReady, setMicReady] = useState(false);

  const recorder = useRef(new Recorder());
  const pending = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;

  const player = getPlayer();
  const lang = info.language;

  const update = (id: number, patch: Partial<Msg>) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  // ---------- voz do tutor ----------
  const speak = useCallback(
    async (msg: Msg, slow = false) => {
      setNeedsTap(null);
      let url = msg.audioUrl;
      try {
        if (!url) {
          setStatus("voice");
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg.text, language: lang, country: info.country }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? "Voz indisponível agora.");
          }
          url = URL.createObjectURL(await res.blob());
          update(msg.id, { audioUrl: url });
        }
        setStatus("speaking");
        await player.play(url, slow ? 0.75 : 1);
      } catch (err) {
        const name = (err as { name?: string }).name;
        if (name === "NotAllowedError") {
          setNeedsTap(msg.id);
        } else {
          update(msg.id, { showText: true });
          setError(`${(err as Error).message} Mostrando o texto.`);
        }
      } finally {
        setStatus((s) => (s === "voice" || s === "speaking" ? "idle" : s));
      }
    },
    [lang, info.country, player],
  );

  // Primeira fala do tutor.
  useEffect(() => {
    let show = false;
    try {
      show = localStorage.getItem(SHOW_TEXT_KEY) === "1";
    } catch {}
    setAlwaysText(show);
    const first: Msg = {
      id: nextId++,
      role: "assistant",
      text: info.turn.reply,
      pt: info.turn.translation_pt,
      correction: info.turn.correction,
      showText: show,
    };
    setMessages([first]);
    speak(first);
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((p) => setMicReady(p.state === "granted"))
      .catch(() => {});
    const rec = recorder.current;
    return () => {
      rec.release();
      player.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, status]);

  // ---------- tempo praticado ----------
  const flush = useCallback(
    (beacon = false) => {
      const seconds = pending.current;
      if (seconds <= 0) return;
      pending.current = 0;
      const body = JSON.stringify({ sessionId: info.sessionId, seconds });
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/session/heartbeat", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/session/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => {
          pending.current += seconds;
        });
      }
    },
    [info.sessionId],
  );

  useEffect(() => {
    const tick = setInterval(() => {
      if (paused || ending || document.visibilityState !== "visible") return;
      setElapsed((e) => e + 1);
      pending.current += 1;
      if (pending.current >= 30) flush();
    }, 1000);
    const onHide = () => flush(true);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(tick);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [paused, ending, flush]);

  const goalReached = elapsed >= info.targetMinutes * 60;

  // ---------- envio de uma fala ou texto ----------
  async function send(payload: { blob?: Blob; seconds?: number; text?: string; kind?: string }) {
    setStatus("sending");
    setError("");
    setFailed(null);
    const form = new FormData();
    form.append("sessionId", info.sessionId);
    if (payload.kind) form.append("kind", payload.kind);
    if (payload.blob) {
      form.append("audio", payload.blob, "fala");
      form.append("seconds", String(Math.ceil(payload.seconds ?? 1)));
    }
    if (payload.text) form.append("text", payload.text);
    try {
      const res = await api<{ transcript: string | null; turn: TutorTurn }>("/api/session/turn", { method: "POST", body: form });
      const userText = payload.kind === "wrong_transcript" ? null : res.transcript ?? payload.text ?? "";
      const tutor: Msg = {
        id: nextId++,
        role: "assistant",
        text: res.turn.reply,
        pt: res.turn.translation_pt,
        correction: res.turn.correction,
        doubt: res.turn.recognition_doubt,
        showText: alwaysText,
      };
      setMessages((ms) => [
        ...ms,
        ...(userText !== null ? [{ id: nextId++, role: "user" as const, text: userText, via: payload.blob ? ("voz" as const) : ("texto" as const) }] : []),
        tutor,
      ]);
      setStatus("idle");
      speak(tutor);
    } catch (err) {
      setError((err as Error).message);
      setFailed(payload);
      setStatus("idle");
    }
  }

  async function toggleRecording() {
    if (status === "recording") {
      try {
        const { blob, seconds } = await recorder.current.stop();
        if (seconds < 0.6 || blob.size < 1000) {
          setStatus("idle");
          setError("A gravação ficou curta demais. Toque, fale e toque de novo para enviar.");
          return;
        }
        await send({ blob, seconds });
      } catch (err) {
        setStatus("idle");
        setError((err as Error).message);
      }
      return;
    }
    player.unlock();
    player.stop();
    setError("");
    try {
      await recorder.current.start();
      setMicReady(true);
      setMicError(null);
      setRecordSeconds(0);
      setStatus("recording");
    } catch (err) {
      setMicError(micErrorKind(err));
      setStatus("idle");
    }
  }

  // Limite de duração de cada fala.
  useEffect(() => {
    if (status !== "recording") return;
    const t = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);
  useEffect(() => {
    if (status === "recording" && recordSeconds >= MAX_RECORD_SECONDS) toggleRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordSeconds, status]);

  function cancelRecording() {
    recorder.current.cancel();
    setStatus("idle");
  }

  function sendText(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    send({ text });
  }

  function flagTranscript(m: Msg) {
    update(m.id, { flagged: true });
    send({ kind: "wrong_transcript" });
  }

  function togglePause() {
    if (!paused) {
      recorder.current.cancel();
      player.stop();
      if (status === "recording") setStatus("idle");
      flush();
    } else {
      player.unlock();
    }
    setPaused(!paused);
  }

  async function end() {
    setEnding(true);
    recorder.current.release();
    player.stop();
    const seconds = pending.current;
    pending.current = 0;
    try {
      const res = await api<{ summary: SessionSummary | null; minutes: number }>("/api/session/end", {
        method: "POST",
        body: JSON.stringify({ sessionId: info.sessionId, seconds }),
      });
      onEnded(res.summary, res.minutes);
    } catch (err) {
      pending.current += seconds;
      setEnding(false);
      setError(`Não consegui gerar o resumo: ${(err as Error).message} Tente encerrar de novo.`);
    }
  }

  function setShowAll(v: boolean) {
    setAlwaysText(v);
    try {
      localStorage.setItem(SHOW_TEXT_KEY, v ? "1" : "0");
    } catch {}
    if (v) setMessages((ms) => ms.map((m) => (m.role === "assistant" ? { ...m, showText: true } : m)));
  }

  const busy = status === "sending" || ending;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const mm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <main className="shell session">
      <header className="session-bar">
        <div>
          <p className="session-lang">
            {LANGUAGE_NAMES[lang]}
            {info.country ? ` · ${COUNTRIES[info.country]}` : ""}
          </p>
          <p className={`timer ${goalReached ? "done" : ""}`} aria-live="off">
            {mm(elapsed)} / {info.targetMinutes}:00
          </p>
        </div>
        <div className="row">
          <button className="secondary" onClick={togglePause} disabled={ending}>
            {paused ? "Continuar" : "Pausar"}
          </button>
          <button className="danger" onClick={end} disabled={ending || status === "sending"}>
            {ending ? "Resumindo…" : "Encerrar"}
          </button>
        </div>
      </header>

      {goalReached && !goalShown && (
        <div className="card notice good" role="status">
          <p>Você completou seus {info.targetMinutes} minutos. Pode encerrar para ver o resumo ou continuar mais um pouco.</p>
          <button className="secondary" onClick={() => setGoalShown(true)}>
            Continuar conversando
          </button>
        </div>
      )}

      <label className="switch">
        <input type="checkbox" checked={alwaysText} onChange={(e) => setShowAll(e.target.checked)} />
        Sempre mostrar o texto do tutor
      </label>

      <div className="messages" ref={listRef} aria-live="polite">
        {messages.map((m) =>
          m.role === "assistant" ? (
            <div key={m.id} className="bubble tutor">
              {m.showText ? <p className="say">{m.text}</p> : <p className="say hidden-text">Ouça a resposta. Toque em “Texto” se precisar.</p>}
              {m.showPt && m.pt && <p className="pt">{m.pt}</p>}
              {m.correction && (
                <details className="correction">
                  <summary>Ver correção</summary>
                  <p>
                    <s>{m.correction.original}</s> → <strong>{m.correction.natural}</strong>
                  </p>
                  <p className="pt">{m.correction.note_pt}</p>
                </details>
              )}
              <div className="tools">
                <button onClick={() => speak(m)} disabled={busy || status === "recording"}>
                  ▶ Repetir
                </button>
                <button onClick={() => speak(m, true)} disabled={busy || status === "recording"}>
                  Mais devagar
                </button>
                <button onClick={() => update(m.id, { showText: !m.showText })} aria-pressed={!!m.showText}>
                  Texto
                </button>
                <button onClick={() => update(m.id, { showPt: !m.showPt, showText: true })} aria-pressed={!!m.showPt}>
                  Explicar em português
                </button>
              </div>
              {needsTap === m.id && (
                <button className="primary" onClick={() => speak(m)}>
                  Tocar resposta
                </button>
              )}
            </div>
          ) : (
            <div key={m.id} className={`bubble me ${m.flagged ? "flagged" : ""}`}>
              <p>{m.text}</p>
              {m.via === "voz" && m === lastUser && !m.flagged && (
                <button className="link" onClick={() => flagTranscript(m)} disabled={busy}>
                  Não foi isso que eu disse
                </button>
              )}
            </div>
          ),
        )}
        {status === "sending" && <p className="status-line">Ouvindo sua fala e preparando a resposta…</p>}
        {status === "voice" && <p className="status-line">Gerando a voz do tutor…</p>}
      </div>

      {error && (
        <div className="card notice" role="alert">
          <p>{error}</p>
          <div className="row">
            {failed && (
              <button className="secondary" onClick={() => send(failed)} disabled={busy}>
                Tentar enviar de novo
              </button>
            )}
            <button className="ghost" onClick={() => (setError(""), setFailed(null))}>
              Fechar aviso
            </button>
          </div>
        </div>
      )}

      {micError && <MicHelp kind={micError} onText={() => setTextMode(true)} onRetry={toggleRecording} />}

      {paused ? (
        <div className="card notice">
          <p>Sessão pausada. O tempo não está contando.</p>
          <button className="primary" onClick={togglePause}>
            Continuar
          </button>
        </div>
      ) : (
        <footer className="composer">
          {textMode ? (
            <form className="text-row" onSubmit={sendText}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={lang === "en" ? "Type in English…" : "Escribí en español…"}
                maxLength={1500}
                disabled={busy}
                aria-label="Mensagem"
              />
              <button className="primary" disabled={busy || !draft.trim()}>
                Enviar
              </button>
              <button type="button" className="ghost" onClick={() => setTextMode(false)}>
                Voz
              </button>
            </form>
          ) : (
            <div className="mic-row">
              {status === "recording" ? (
                <button className="ghost" onClick={cancelRecording}>
                  Cancelar
                </button>
              ) : (
                <button className="ghost" onClick={() => setTextMode(true)}>
                  Digitar
                </button>
              )}
              <button
                className={`mic ${status === "recording" ? "rec" : ""}`}
                onClick={toggleRecording}
                disabled={busy || status === "voice"}
                aria-label={status === "recording" ? "Parar e enviar" : "Falar"}
              >
                <MicIcon />
              </button>
              <span className="mic-label">
                {status === "recording"
                  ? `Gravando ${mm(recordSeconds)} · toque para enviar`
                  : status === "speaking"
                    ? "Tutor falando · toque no microfone para responder"
                    : status === "sending"
                      ? "Processando…"
                      : micReady
                        ? "Toque para falar"
                        : "Toque para falar (vou pedir o microfone)"}
              </span>
            </div>
          )}
          {!micReady && !textMode && (
            <p className="hint">Sua fala é enviada só para ser transcrita; o áudio não fica guardado.</p>
          )}
        </footer>
      )}
    </main>
  );
}

function MicHelp({ kind, onText, onRetry }: { kind: MicError; onText: () => void; onRetry: () => void }) {
  const text =
    kind === "denied"
      ? "O acesso ao microfone foi negado. No iPhone: Ajustes › Apps › Safari › Microfone (ou, no app instalado, toque em “aA” › Ajustes do Site). No Chrome: toque no cadeado ao lado do endereço › Microfone › Permitir. Depois, tente de novo."
      : kind === "no-device"
        ? "Não encontrei um microfone neste aparelho."
        : kind === "unsupported"
          ? "Este navegador não permite gravar áudio aqui. Use Safari (iPhone) ou Chrome atualizados."
          : "Não consegui acessar o microfone.";
  return (
    <div className="card notice" role="alert">
      <p>{text}</p>
      <div className="row">
        <button className="secondary" onClick={onRetry}>
          Tentar de novo
        </button>
        <button className="ghost" onClick={onText}>
          Usar texto
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
      <path fill="currentColor" d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 1 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V20H8.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2H13v-2.59a6 6 0 0 0 5-5.91Z" />
    </svg>
  );
}
