# RPG — O Jogador Consciente

O Autorretrato do Jogador: um app de página única que calcula um retrato a
partir do nascimento e das respostas da pessoa, e termina em pergunta.

**Antes de mexer em qualquer coisa, leia o [CLAUDE.md](CLAUDE.md).**

## Começando

```bash
npm install                 # playwright, para os testes
python3 build_bundle.py     # gera src/motor.browser.js a partir de engine/src/
python3 build.py            # gera out/*.html
node testes/testdatas.mjs | md5sum   # 5a0cb5f73a0637f40633981ba9b7805b
```

Abra `out/1-SITE-autorretrato.html` no navegador. É isso: um arquivo, sem servidor.

## O que vai para o ar

| Arquivo | Destino |
|---|---|
| `out/2-LOVABLE-index.html` | Lovable → `rpg.ojogadorconsciente.com.br` |
| `out/1-SITE-autorretrato.html` | qualquer host estático |
| `admin/admin.html` | subdomínio `admin.` (renomear para `index.html`) |

## Mapa do repositório

```
CLAUDE.md              as regras — leia primeiro
build.py               monta o HTML final
build_bundle.py        monta o motor para o navegador
VERSAO                 a versão atual
CHANGELOG.md           o que mudou e por quê

src/
  app4.js              o app inteiro: telas, Modo de Instrução, Ficha, PDF, Etapa 7
  narrativa.js         gera a história do Autorretrato (5 movimentos + fecho)
  page2.tpl.html       o esqueleto e todo o CSS
  cidades.json         5.570 municípios brasileiros + fusos IANA
  motor.browser.js     GERADO — não editar

engine/src/            o motor de oráculos (fonte)
vendor/                astronomy-engine (efemérides, MIT)

admin/                 a Sala de Comando
supabase/migracoes/    o banco, em SQL
supabase/functions/    as Edge Functions
testes/                Playwright
docs/                  decisões, briefings, handover
```

## Atalhos úteis

- `?porta=10` — a oferta da Etapa 7 abre em 10 segundos em vez de 16m50.
- O botão `recomeçar` limpa tudo (não aparece na Etapa 7, de propósito).

## Licenças de terceiros

- [astronomy-engine](https://github.com/cosinekitty/astronomy) — MIT
- IPIP-50 — domínio público
- GeoNames cities1000 — CC BY 4.0
