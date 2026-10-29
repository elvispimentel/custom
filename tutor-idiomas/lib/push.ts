import webpush from "web-push";
import { db, must } from "./db";

type Vapid = { publicKey: string; privateKey: string };

let cached: Vapid | null = null;

/** Gera as chaves VAPID uma única vez e guarda no banco — nenhuma chave precisa ir para o código. */
export async function vapidKeys(): Promise<Vapid> {
  if (cached) return cached;
  const row = must(await db().from("tutor_kv").select("value").eq("key", "vapid").maybeSingle()) as { value: Vapid } | null;
  if (row) return (cached = row.value);
  const fresh = webpush.generateVAPIDKeys();
  // "ignoreDuplicates" garante que duas instâncias simultâneas fiquem com o mesmo par.
  must(await db().from("tutor_kv").upsert({ key: "vapid", value: fresh }, { onConflict: "key", ignoreDuplicates: true }));
  const stored = must(await db().from("tutor_kv").select("value").eq("key", "vapid").single()) as { value: Vapid };
  return (cached = stored.value);
}

function subject(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "https://tutor-idiomas.vercel.app";
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

export async function sendToAll(payload: PushPayload): Promise<{ sent: number; removed: number; failed: number }> {
  const keys = await vapidKeys();
  const subs = must(await db().from("tutor_push_subscriptions").select("endpoint,p256dh,auth")) as {
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  let sent = 0;
  let removed = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { vapidDetails: { subject: subject(), publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 3600, urgency: "high" },
      );
      sent++;
      await db().from("tutor_push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("endpoint", s.endpoint);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db().from("tutor_push_subscriptions").delete().eq("endpoint", s.endpoint);
        removed++;
      } else {
        failed++;
        console.error("Push falhou", status, (err as Error).message);
      }
    }
  }
  return { sent, removed, failed };
}
