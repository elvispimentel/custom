# Fazer o app instalar na tela do celular — na Lovable

O `manifest.json` é o arquivo que diz ao celular "isto é um aplicativo, não uma
página". Sem ele, o Android e o iPhone abrem o jogo dentro do navegador, com a
barra de endereço em cima — e o Modo de Instrução perde metade da força.

## O que fazer

Manda esta mensagem para a Lovable, tal e qual:

> Adicione o arquivo `manifest.json` na pasta `public/` do projeto, com exatamente
> este conteúdo (colar o conteúdo do arquivo `2-LOVABLE-manifest.json`).
>
> Adicione também na pasta `public/` dois ícones PNG quadrados de fundo escuro:
> `icone-192.png` (192×192) e `icone-512.png` (512×512).
>
> Não altere o `index.html` — ele já traz a linha
> `<link rel="manifest" href="/manifest.json">` e as meta tags de app.
>
> Depois publique.

## Como conferir que funcionou

No celular, abra `rpg.ojogadorconsciente.com.br` no Chrome. No menu dos três
pontinhos deve aparecer **"Instalar aplicativo"** (Android) ou, no Safari,
Compartilhar ▸ **"Adicionar à Tela de Início"**.

Abra pelo ícone. Se não houver barra de endereço, está certo.

## Os ícones

Você ainda não me mandou os ícones. Enquanto eles não existirem, o celular usa uma
captura da tela — funciona, mas fica feio. Um quadrado escuro com o símbolo do jogo
resolve: me manda a arte e eu gero os dois tamanhos.
