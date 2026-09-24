import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// SEGREDO REDIGIDO NESTE ARQUIVO — leia antes de reimplantar.
// A versão que está rodando em produção (Supabase) tem este valor como
// uma constante de texto puro no código-fonte, não como secret de ambiente.
// Como este repositório é público, o valor real foi substituído por uma
// variável de ambiente aqui. Isso significa que, se você reimplantar a
// partir deste arquivo sem configurar o secret, o webhook vai parar de
// autenticar. Ação recomendada: (1) rodar `supabase secrets set
// CAKTO_WEBHOOK_SECRET=<valor real>` para este projeto, e (2) considerar
// rotacionar o segredo na Cakto, já que ele ficou exposto em texto puro
// no código-fonte da função implantada até este ponto.
const CAKTO_WEBHOOK_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const bodyText = await req.text();
  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const providedSecret =
    payload?.secret ||
    req.headers.get("x-webhook-secret") ||
    req.headers.get("x-cakto-secret");

  if (!CAKTO_WEBHOOK_SECRET || providedSecret !== CAKTO_WEBHOOK_SECRET) {
    console.log("DIAG secret mismatch, got prefix=", providedSecret ? String(providedSecret).slice(0, 8) : null);
    return new Response("Unauthorized", { status: 401 });
  }

  const data = payload?.data ?? {};
  const orderId = data?.id;
  const email = data?.customer?.email;
  const productName = data?.product?.name;
  const paymentMethod = data?.paymentMethod;
  const paidAt = data?.paidAt;
  const refId = data?.refId;
  const eventType = payload?.event ?? data?.status;

  if (!orderId) {
    return new Response("Missing order id", { status: 400 });
  }

  let status = "pending";
  const eventStr = String(eventType ?? "").toLowerCase();
  if (eventStr.includes("approved") || eventStr === "paid") status = "paid";
  else if (eventStr.includes("refused") || eventStr.includes("failed")) status = "refused";
  else if (eventStr.includes("refund")) status = "refunded";
  else if (eventStr.includes("chargeback") || eventStr.includes("canceled") || eventStr.includes("cancelled")) status = "refunded";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await supabase.from("imersao_orders").upsert(
    {
      cakto_order_id: String(orderId),
      email,
      product_name: productName,
      payment_method: paymentMethod,
      paid_at: paidAt,
      ref_id: refId,
      status,
      raw_payload: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cakto_order_id" }
  );

  if (error) {
    console.error(error);
    return new Response("Database error", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
