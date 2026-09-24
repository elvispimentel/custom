import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const u = new URL(req.url);
    const termo = (u.searchParams.get('q') || '').slice(0, 60);
    if (termo.trim().length < 2) {
      return new Response('[]', { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    const { data, error } = await sb.rpc('buscar_cidade', { termo, limite: 10 });
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify(data || []), {
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
