# Relatório final — Biblioteca Pessoal para o NotebookLM

Após a conversão de documentos para PDF e os Retomares finais (sem lote com erro).

## 1. Arquivos gerados
**307 arquivos mesclados** contendo **3105 livros** (dos quais **465** foram convertidos de docx, doc, txt, rtf, epub etc.).

## 2. Livros por arquivo (por grupo)
| Grupo | Arquivos | Livros | Convertidos | Média livros/arquivo |
|---|---|---|---|---|
| 00 - Arquivos pessoais (Elvis Pimentel) | 2 | 29 | 0 | 14.5 |
| Cabala e Misticismo | 52 | 328 | 33 | 6.3 |
| Desenvolvimento Pessoal | 28 | 251 | 23 | 9.0 |
| Filosofia | 8 | 59 | 6 | 7.4 |
| Física Quântica e Ciência | 10 | 44 | 4 | 4.4 |
| Hermetismo e Esoterismo | 39 | 326 | 25 | 8.4 |
| História e Sociedade | 16 | 57 | 0 | 3.6 |
| Psicologia e Arquétipos | 16 | 71 | 0 | 4.4 |
| Religião e Teologia | 10 | 111 | 2 | 11.1 |
| Saúde e Corpo | 7 | 58 | 4 | 8.3 |
| Sem tema | 111 | 1504 | 246 | 13.5 |
| Vendas e Negócios | 8 | 267 | 122 | 33.4 |

Detalhe de cada arquivo: `arquivos_por_lote.csv`. Quais livros estão em cada arquivo e em quais páginas: `livros_por_arquivo.csv`.

## 3. NotebookLM
O upload é manual (nenhum conector de NotebookLM foi encontrado). Fontes: 307 mesclados + 34 livros grandes a enviar separadamente = 341.
Plano gratuito: 50 fontes por caderno, ou seja, no mínimo 7 cadernos. Plus: 300 por caderno, ou seja, 2 cadernos.
Atenção: só use os arquivos de lote cujo status no `indice_pdfs.csv` é `done`. Lotes antigos marcados `obsoleto` continuam na pasta de saída do Drive (foram refeitos); não envie esses ao NotebookLM.

## Livros que ficaram de fora (`livros_nao_incluidos.csv`: 85 livros)
- Grande demais para um lote — enviar separado ou dividir: 34
- Arquivo vazio (0 byte) — reenviar: 29
- PDF defeituoso (não abre ou quebra a união): 16
- PDF com senha: 3
- PDF escaneado (precisa de OCR): 2
- Falha na conversão para PDF: 1

## Atenção: livros escaneados já estão dentro dos lotes
138 PDFs escaneados (imagem, sem texto) **entraram nos lotes**, mas o NotebookLM não consegue ler o conteúdo deles sem OCR.
Lista: `livros_escaneados_dentro_dos_lotes.csv` (livro → arquivo final).
