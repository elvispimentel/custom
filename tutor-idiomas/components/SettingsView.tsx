"use client";

import { useEffect, useState } from "react";
import type { AppState } from "./App";
import { api } from "@/lib/client/api";
import { LANGUAGE_NAMES, type Language, type Reminder, type Settings } from "@/lib/types";

const SLOT_LABELS: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

const ZONES = [
  ["America/Sao_Paulo", "Brasília (São Paulo)"],
  ["America/Argentina/Buenos_Aires", "Argentina (Buenos Aires)"],
  ["America/Montevideo", "Uruguai (Montevidéu)"],
  ["America/Asuncion", "Paraguai (Assunção)"],
  ["America/La_Paz", "Bolívia (La Paz)"],
  ["America/Manaus", "Manaus"],
  ["America/Recife", "Recife / Fortaleza"],
  ["Europe/Lisbon", "Lisboa"],
  ["Europe/Madrid", "Madri"],
  ["Europe/London", "Londres"],
  ["America/New_York", "Nova York"],
];

type PushState = "checking" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function SettingsView({
  state,
  onBack,
  onChange,
  onPushChange,
}: {
  state: AppState;
  onBack: () => void;
  onChange: (s: Settings) => void;
  onPushChange: () => void;
}) {
  const [settings, setSettings] = useState(state.settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [push, setPush] = useState<PushState>("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const browserZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPush(isIOS() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setPush("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setPush(sub ? "on" : "off");
    })().catch(() => setPush("unsupported"));
  }, []);

  async function save(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    setMessage("");
    try {
      const res = await api<{ settings: Settings }>("/api/settings", { method: "PUT", body: JSON.stringify(patch) });
      setSettings(res.settings);
      onChange(res.settings);
      setMessage("Salvo.");
    } catch (err) {
      setSettings(settings);
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function updateReminder(i: number, patch: Partial<Reminder>) {
    save({ reminders: settings.reminders.map((r, j) => (i === j ? { ...r, ...patch } : r)) });
  }

  async function enablePush() {
    setPushBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPush(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const { publicKey } = await api<{ publicKey: string }>("/api/push/key");
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
      await api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON() }) });
      setPush("on");
      setMessage("Lembretes ativados neste aparelho.");
      onPushChange();
    } catch (err) {
      setMessage(`Não consegui ativar: ${(err as Error).message}`);
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api("/api/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setPush("off");
      onPushChange();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setPushBusy(false);
    }
  }

  async function testPush() {
    setPushBusy(true);
    try {
      const r = await api<{ sent: number; failed: number; removed: number }>("/api/push/test", { method: "POST" });
      setMessage(r.sent ? `Notificação de teste enviada para ${r.sent} aparelho(s).` : "Nenhum aparelho recebeu. Ative os lembretes primeiro.");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setPushBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const zones = ZONES.some(([z]) => z === browserZone) || !browserZone ? ZONES : [[browserZone, `${browserZone} (este aparelho)`], ...ZONES];
  const allZones = zones.some(([z]) => z === settings.timezone) ? zones : [[settings.timezone, settings.timezone], ...zones];

  return (
    <main className="shell">
      <header className="topbar">
        <button className="ghost" onClick={onBack}>
          ← Voltar
        </button>
        <h1 className="brand small">Lembretes e ajustes</h1>
      </header>

      {message && (
        <p className="card notice" role="status">
          {message}
        </p>
      )}

      <section className="card stack">
        <h2>Notificações neste aparelho</h2>
        {push === "checking" && <p className="muted">Verificando…</p>}
        {push === "needs-install" && (
          <div className="stack-sm">
            <p>No iPhone, as notificações só funcionam com o app instalado na Tela de Início (iOS 16.4 ou mais recente):</p>
            <ol>
              <li>Abra este endereço no Safari.</li>
              <li>Toque em Compartilhar (quadrado com seta) › “Adicionar à Tela de Início”.</li>
              <li>Abra o Tutor pelo ícone e volte aqui para ativar.</li>
            </ol>
          </div>
        )}
        {push === "unsupported" && <p>Este navegador não oferece notificações push. No computador, use Chrome, Edge ou Firefox; no iPhone, instale o app na Tela de Início.</p>}
        {push === "denied" && (
          <p>
            As notificações foram bloqueadas para este app. Libere em Ajustes › Notificações › Tutor (iPhone) ou nas configurações do site no navegador, e
            recarregue.
          </p>
        )}
        {push === "off" && (
          <>
            <p className="muted">Você recebe um aviso nos horários abaixo. Toque no aviso para abrir a sessão.</p>
            <button className="primary" onClick={enablePush} disabled={pushBusy}>
              Ativar lembretes neste aparelho
            </button>
          </>
        )}
        {push === "on" && (
          <div className="row">
            <span className="pill good">Ativo neste aparelho</span>
            <button className="secondary" onClick={testPush} disabled={pushBusy}>
              Enviar teste
            </button>
            <button className="ghost" onClick={disablePush} disabled={pushBusy}>
              Desativar
            </button>
          </div>
        )}
        <p className="hint">Aparelhos com lembretes ativos: {state.pushDevices}.</p>
      </section>

      <section className="card stack">
        <div className="row spread">
          <h2>Horários</h2>
          <label className="switch">
            <input type="checkbox" checked={settings.paused} onChange={(e) => save({ paused: e.target.checked })} disabled={saving} />
            Pausar lembretes
          </label>
        </div>
        {settings.reminders.map((r, i) => (
          <div key={r.slot} className={`reminder ${r.enabled ? "" : "off"}`}>
            <label className="switch">
              <input type="checkbox" checked={r.enabled} onChange={(e) => updateReminder(i, { enabled: e.target.checked })} disabled={saving} />
              {SLOT_LABELS[r.slot] ?? r.slot}
            </label>
            <select value={r.hour} onChange={(e) => updateReminder(i, { hour: Number(e.target.value) })} disabled={saving} aria-label="Hora">
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}h
                </option>
              ))}
            </select>
            <select
              value={r.language}
              onChange={(e) => updateReminder(i, { language: e.target.value as Language })}
              disabled={saving}
              aria-label="Idioma"
            >
              {(["es", "en"] as Language[]).map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_NAMES[l]}
                </option>
              ))}
            </select>
          </div>
        ))}
        <p className="hint">
          O aviso chega entre a hora escolhida e cerca de 1 hora depois (limite do plano gratuito da Vercel). Se você já praticou aquele idioma na última hora e
          meia, o aviso não é enviado.
        </p>

        <label className="stack-sm">
          <span className="label">Fuso horário</span>
          <select value={settings.timezone} onChange={(e) => save({ timezone: e.target.value })} disabled={saving}>
            {allZones.map(([z, label]) => (
              <option key={z} value={z}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {browserZone && browserZone !== settings.timezone && (
          <button className="secondary" onClick={() => save({ timezone: browserZone })} disabled={saving}>
            Usar o fuso deste aparelho ({browserZone})
          </button>
        )}

        <label className="stack-sm">
          <span className="label">Duração de cada sessão</span>
          <select value={settings.session_minutes} onChange={(e) => save({ session_minutes: Number(e.target.value) })} disabled={saving}>
            {[10, 15, 20, 25, 30].map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </select>
        </label>
        <p className="hint">3 × 15 minutos é um ponto de partida, não uma fórmula: distribuir a prática ao longo do dia ajuda, e a dose certa é a que você mantém.</p>
      </section>

      <section className="card stack">
        <h2>Instalar no celular</h2>
        <p>
          <strong>iPhone:</strong> Safari › Compartilhar › “Adicionar à Tela de Início”.
        </p>
        <p>
          <strong>Android:</strong> Chrome › menu ⋮ › “Instalar app” ou “Adicionar à tela inicial”.
        </p>
        <button className="ghost" onClick={logout}>
          Sair deste aparelho
        </button>
      </section>
    </main>
  );
}
