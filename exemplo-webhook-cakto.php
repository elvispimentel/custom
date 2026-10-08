<?php

// Exemplo feito em PHP de um receptor de webhook da Cakto.
//
// ATENÇÃO: os nomes de campo abaixo são placeholders. Confirme o formato exato
// do payload e do mecanismo de validação do "secret" na documentação oficial
// da Cakto (docs.cakto.com.br/api-reference/webhooks) antes de usar em produção.

// A Cakto envia o payload do evento como JSON no corpo da requisição.
$payload = json_decode(file_get_contents('php://input'), true);

if (!$payload) {
    http_response_code(400);
    exit('Payload inválido');
}

// O secret configurado no cadastro do webhook, no painel da Cakto.
// Nunca deixe o valor real do secret hardcoded no código - use variável de ambiente.
$webhookSecret = getenv('CAKTO_WEBHOOK_SECRET');

// Placeholder: ajuste conforme onde a Cakto realmente envia o secret
// (pode ser um campo no corpo, um header customizado, ou uma assinatura HMAC).
$secretRecebido = $payload['secret'] ?? ($_SERVER['HTTP_X_CAKTO_SECRET'] ?? null);

if (!$webhookSecret || !$secretRecebido || !hash_equals($webhookSecret, $secretRecebido)) {
    http_response_code(401);
    exit('Assinatura inválida');
}

// Placeholder: campo de evento (ex.: "purchase_approved", reembolso, assinatura renovada).
$evento = $payload['event'] ?? null;

// Placeholder: dados do cliente e do produto comprado.
$clienteEmail = $payload['customer']['email'] ?? null;
$produtoId = $payload['product']['id'] ?? null;

switch ($evento) {
    case 'purchase_approved':
        // Liberar acesso do usuário ao conteúdo/painel no seu banco de dados
        // (ex.: Supabase), usando $clienteEmail e $produtoId para identificar o registro.
        break;

    case 'refund':
    case 'purchase_refunded':
        // Revogar o acesso do usuário.
        break;

    default:
        // Evento não tratado - apenas confirme o recebimento.
        break;
}

http_response_code(200);
echo 'ok';
