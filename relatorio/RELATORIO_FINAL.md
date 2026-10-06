# Relatório final — Biblioteca Pessoal para o NotebookLM

Atualizado após a conversão de documentos para PDF e o Retomar final.

## 1. Arquivos gerados
**306 arquivos mesclados** contendo **3087 livros** (dos quais **465** foram convertidos de docx, doc, txt, rtf, epub etc.).

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
| Sem tema | 110 | 1486 | 246 | 13.5 |
| Vendas e Negócios | 8 | 267 | 122 | 33.4 |

Detalhe de cada arquivo: `arquivos_por_lote.csv`. Quais livros estão em cada arquivo e em quais páginas: `livros_por_arquivo.csv`.

## 3. NotebookLM
O upload é manual (nenhum conector de NotebookLM foi encontrado). Fontes: 306 mesclados + 34 livros grandes a enviar separadamente = 340.
Plano gratuito: 50 fontes por caderno, ou seja, no mínimo 7 cadernos. Plus: 300 por caderno, ou seja, 2 cadernos.
Atenção: só use os arquivos de lote cujo status no `indice_pdfs.csv` é `done`. Lotes antigos marcados `obsoleto` (o último de cada grupo, refeito com os convertidos) continuam na pasta de saída do Drive; não envie esses ao NotebookLM.

## Pendências (`livros_nao_incluidos.csv`: 103 livros)
- Grande demais para um lote — enviar separado ou dividir: 34
- Arquivo vazio (0 byte) — reenviar: 29
- Lote com erro — rodar Retomar de novo: 18
- PDF defeituoso (não abre): 15
- PDF com senha: 3
- PDF escaneado (precisa de OCR): 3
- Falha na conversão para PDF: 1

## Atenção: livros escaneados já estão dentro dos lotes
137 PDFs escaneados (imagem, sem texto) **entraram nos lotes**, mas o NotebookLM não consegue ler o conteúdo deles sem OCR.
Lista: `livros_escaneados_dentro_dos_lotes.csv` (livro → arquivo final). Rodar OCR neles melhora o resultado; sem isso, ficam como páginas em branco para a IA.
