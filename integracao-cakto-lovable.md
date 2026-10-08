# Integração Cakto + Lovable

A integração entre a [Cakto](https://cakto.com.br) e a [Lovable](https://lovable.dev/pt-br/meta-lp) permite que aplicações construídas com IA na Lovable realizem cobranças, gerenciem assinaturas e liberem acesso a conteúdo/áreas restritas automaticamente, a partir de pagamentos processados na Cakto (Pix, cartão, boleto etc).

Assim como a entrega customizada da Eduzz (ver `README.md` neste repositório), o mecanismo central é um **webhook**: a Cakto avisa o backend da sua aplicação sempre que algo relevante acontece em uma venda (compra aprovada, assinatura renovada, reembolso etc), e o backend decide o que fazer com essa informação.

## Como funciona

1. **Geração de cobrança**: o app na Lovable chama a API da Cakto para gerar uma fatura, um Pix dinâmico ou um link de pagamento para o produto/infoproduto/comunidade paga.
2. **Confirmação via webhook**: quando o pagamento é efetuado na Cakto, um webhook é disparado para a URL configurada no seu backend (tipicamente Supabase, ou uma função no próprio Lovable Cloud), liberando automaticamente o acesso do usuário.
3. **Assinaturas recorrentes**: é possível configurar cobrança recorrente / Pix automático para gerenciar assinaturas de produtos tipo MicroSaaS.

## Passos gerais para implementar

1. **Estruture o app na Lovable**: crie a interface de checkout e o dashboard do usuário usando comandos em linguagem natural.
2. **Configure a Cakto**: no painel da Cakto, em **Apps/Integrações**, gere as credenciais de API e cadastre a URL do seu backend que vai receber os webhooks (veja [ajuda.cakto.com.br](https://ajuda.cakto.com.br/pt/category/integracoes-1bdui8u/)).
3. **Implemente o receptor do webhook**: no backend (Supabase Edge Function, rota da própria Lovable, ou outro servidor), escute os eventos de compra da Cakto e atualize o status de acesso do usuário no banco de dados.
4. **Valide a autenticidade do webhook**: cada webhook cadastrado na Cakto tem um `secret` próprio. Use-o para confirmar que a requisição recebida realmente veio da Cakto antes de liberar qualquer acesso — nunca confie apenas na URL ser "secreta".

## Sobre o payload do webhook

A Cakto expõe eventos como `purchase_approved` (compra aprovada), além de eventos de reembolso e de assinatura, com informações do produto, forma de pagamento (Pix, cartão, boleto) e um `secret` de verificação associado ao webhook cadastrado.

> **Importante:** não foi possível acessar a documentação oficial (`docs.cakto.com.br/api-reference/webhooks`) a partir deste ambiente para confirmar os nomes exatos de todos os campos do payload. Antes de implementar em produção, confirme na documentação oficial da Cakto (ou no suporte deles) o formato exato do JSON recebido e o método de validação do `secret` (se vai no corpo, em um header, ou como assinatura HMAC). O exemplo em `exemplo-webhook-cakto.php` foi escrito de forma defensiva, com nomes de campo como placeholders a serem ajustados conforme a documentação real.

## Segurança das credenciais

As credenciais de API/webhook da Cakto (client id, client secret, secret do webhook) são sensíveis e **não devem ser commitadas em texto puro no repositório**. Guarde-as em variáveis de ambiente (ex.: no Supabase, em "Project Settings > Secrets"; em outro servidor, em um `.env` fora do controle de versão).
