"use client";

// Gravação e reprodução pensadas para Safari (iPhone) e Chrome.

const CANDIDATE_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/mp4;codecs=mp4a.40.2"];

export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return CANDIDATE_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";
}

export type MicError = "denied" | "unsupported" | "no-device" | "other";

export function micErrorKind(err: unknown): MicError {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-device";
  if (name === "NotSupportedError" || name === "TypeError") return "unsupported";
  return "other";
}

export class Recorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  get active() {
    return this.recorder?.state === "recording";
  }

  async ensureStream(): Promise<void> {
    if (this.stream?.active) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  }

  async start(): Promise<void> {
    await this.ensureStream();
    const mimeType = pickMimeType();
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream!, mimeType ? { mimeType, audioBitsPerSecond: 48000 } : undefined);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.recorder.start(250);
    this.startedAt = performance.now();
  }

  /** Para a gravação e devolve o áudio e a duração em segundos. */
  stop(): Promise<{ blob: Blob; seconds: number }> {
    return new Promise((resolve, reject) => {
      const rec = this.recorder;
      if (!rec || rec.state === "inactive") return reject(new Error("Nada gravado"));
      rec.onstop = () => {
        const type = (rec.mimeType || this.chunks[0]?.type || "audio/webm").split(";")[0];
        resolve({ blob: new Blob(this.chunks, { type }), seconds: (performance.now() - this.startedAt) / 1000 });
      };
      rec.stop();
    });
  }

  cancel() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.chunks = [];
  }

  /** Libera o microfone (o indicador do sistema some). */
  release() {
    this.cancel();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

/** WAV silencioso curto, gerado aqui para "destravar" o áudio no iPhone. */
function silentWav(): string {
  const samples = 800;
  const buf = new DataView(new ArrayBuffer(44 + samples * 2));
  const text = (o: number, s: string) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  buf.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVEfmt ");
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true);
  buf.setUint32(24, 16000, true);
  buf.setUint32(28, 32000, true);
  buf.setUint16(32, 2, true);
  buf.setUint16(34, 16, true);
  text(36, "data");
  buf.setUint32(40, samples * 2, true);
  let bin = "";
  new Uint8Array(buf.buffer).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export class Player {
  readonly el: HTMLAudioElement;
  private unlocked = false;

  constructor() {
    this.el = new Audio();
    this.el.preload = "auto";
    (this.el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  }

  /** No iPhone, o áudio só toca depois de um toque do usuário: chamar dentro do clique. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.el.src = silentWav();
    this.el.play().catch(() => {
      this.unlocked = false;
    });
  }

  async play(url: string, rate = 1): Promise<void> {
    this.el.pause();
    this.el.src = url;
    this.el.playbackRate = rate;
    const media = this.el as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean };
    media.preservesPitch = true;
    media.webkitPreservesPitch = true;
    await this.el.play();
    await new Promise<void>((resolve) => {
      const done = () => {
        this.el.removeEventListener("ended", done);
        this.el.removeEventListener("pause", done);
        resolve();
      };
      this.el.addEventListener("ended", done);
      this.el.addEventListener("pause", done);
    });
  }

  stop() {
    this.el.pause();
  }
}

let player: Player | null = null;

export function getPlayer(): Player {
  return (player ??= new Player());
}
