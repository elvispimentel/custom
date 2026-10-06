# Relatório final — Biblioteca Pessoal para o NotebookLM

Gerado após o run 26 (Retomar), sem interrupção.

## 1. Arquivos gerados
**287 arquivos mesclados** contendo **2598 livros**.

## 2. Livros por arquivo (por grupo)
| Grupo | Arquivos | Livros | Média livros/arquivo |
|---|---|---|---|
| 00 - Arquivos pessoais (Elvis Pimentel) | 2 | 29 | 14.5 |
| Cabala e Misticismo | 49 | 295 | 6.0 |
| Desenvolvimento Pessoal | 27 | 228 | 8.4 |
| Filosofia | 7 | 53 | 7.6 |
| Física Quântica e Ciência | 10 | 40 | 4.0 |
| Hermetismo e Esoterismo | 36 | 301 | 8.4 |
| História e Sociedade | 16 | 57 | 3.6 |
| Psicologia e Arquétipos | 16 | 71 | 4.4 |
| Religião e Teologia | 9 | 109 | 12.1 |
| Saúde e Corpo | 6 | 54 | 9.0 |
| Sem tema | 101 | 1216 | 12.0 |
| Vendas e Negócios | 8 | 145 | 18.1 |

Detalhe de cada arquivo: `arquivos_por_lote.csv`. Quais livros estão em cada arquivo e em quais páginas: `livros_por_arquivo.csv`.

## 3. NotebookLM
O upload é manual (não há conector de NotebookLM verificado). Fontes: 287 mesclados + 34 enviados separadamente = 321.
Plano gratuito: 50 fontes por caderno, ou seja, no mínimo 7 cadernos. Plus: 300 fontes por caderno, ou seja, 2 cadernos.

## Pendências
- 34 livros grandes demais para o lote (27 excedem 500 mil palavras ou 200 MB e precisam ser divididos antes do upload).
- 139 PDFs escaneados (OCR).
- 15 PDFs inválidos (`NullObject`) — o modo tolerante não resolveu.
- 3 PDFs protegidos por senha.
- 19 com erro de leitura (`DictionaryObject >= int`), 14 com erro 403 de download, 10 com erro 502 de upload (transitório; um Retomar tenta de novo).
- 29 arquivos vazios (0 byte) — reenviar ao Drive.
- Livros em docx, doc, txt, epub e rtf não entraram nos lotes.
