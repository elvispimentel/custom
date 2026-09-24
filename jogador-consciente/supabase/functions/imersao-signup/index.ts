import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Cria a conta real (Supabase Auth) do Jogador da Imersão, para os dois
// caminhos que existem hoje: (1) comprou pela Cakto — e-mail já está em
// imersao_orders com status 'paid'; (2) comprou por fora (Pix direto) mas já
// fez o Autorretrato — e-mail já está em players. Sem um desses dois rastros,
// não deixamos criar conta (não é login público, é o portal de quem comprou).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha1Hex(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-1", dados);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Mesma checagem k-anonymity (HaveIBeenPwned) já validada no projeto Metodo
// Finca — se a API externa falhar, não bloqueia o cadastro por isso.
async function senhaVazada(senha: string): Promise<boolean> {
  try {
    const hash = await sha1Hex(senha);
    const prefixo = hash.slice(0, 5), resto = hash.slice(5);
    const resp = await fetch(`https://api.pwnedpasswords.com/range/${prefixo}`, { headers: { "Add-Padding": "true" } });
    if (!resp.ok) return false;
    const texto = await resp.text();
    return texto.split("\n").some((linha) => linha.trim().split(":")[0] === resto);
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "use POST" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  const { email, senha } = await req.json().catch(() => ({} as any));
  if (!email || !senha) {
    return new Response(JSON.stringify({ ok: false, error: "email e senha são obrigatórios" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (String(senha).length < 8) {
    return new Response(JSON.stringify({ ok: false, error: "a senha precisa ter pelo menos 8 caracteres" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // .limit(1) em vez de .maybeSingle(): pode haver mais de um pedido com o
  // mesmo e-mail (reenvio de webhook de teste, compra duplicada etc.) e
  // .maybeSingle() falha silenciosamente quando vem mais de uma linha.
  const { data: jogadores } = await supabase.from("players").select("player_id, email").ilike("email", emailNorm).limit(1);
  const { data: pedidos } = await supabase.from("imersao_orders").select("id, email").ilike("email", emailNorm).eq("status", "paid").limit(1);
  const jogador = jogadores && jogadores[0];
  const pedido = pedidos && pedidos[0];

  if (!jogador && !pedido) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Não encontramos esse e-mail no seu Autorretrato nem numa compra confirmada. Use o mesmo e-mail que você usou lá.",
    }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  if (await senhaVazada(senha)) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Essa senha já apareceu em vazamentos conhecidos. Escolha outra.",
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { data: criado, error: erroCriar } = await supabase.auth.admin.createUser({
    email: emailNorm,
    password: senha,
    email_confirm: true,
  });

  if (erroCriar) {
    const msg = String(erroCriar.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Já existe uma conta com esse e-mail. Use 'Esqueci minha senha'.",
      }), { status: 409, headers: { "Content-Type": "application/json" } });
    }
    console.error(erroCriar);
    return new Response(JSON.stringify({ ok: false, error: erroCriar.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const userId = criado.user.id;

  if (jogador) {
    await supabase.from("players").update({ user_id: userId }).eq("player_id", jogador.player_id);
  }
  await supabase.from("imersao_orders").update({ user_id: userId }).ilike("email", emailNorm);

  return new Response(JSON.stringify({ ok: true, user_id: userId }), {
    headers: { "Content-Type": "application/json" },
  });
});
