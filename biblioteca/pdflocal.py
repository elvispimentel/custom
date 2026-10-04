"""Motor de merge local (pypdf), executado no próprio runner. Sem limite de arquivos por chamada,
sem créditos e sem transferência pelo Composio. Mesma interface do ILovePDFComposio."""
import io

from pypdf import PdfReader, PdfWriter


class PdfLocal:
    max_arquivos = 10 ** 9          # sem limite prático por chamada
    consome_creditos = False

    def conta(self) -> dict:
        return {"type": "local (pypdf)"}

    def juntar(self, arquivos: list[tuple[str, bytes]], nome_saida: str) -> bytes:
        if len(arquivos) < 2:
            raise ValueError("merge precisa de ao menos 2 arquivos")
        w = PdfWriter()
        for nome, dados in arquivos:
            inicio = len(w.pages)
            leitor = PdfReader(io.BytesIO(dados))
            for pagina in leitor.pages:
                w.add_page(pagina)
            w.add_outline_item(nome.rsplit(".", 1)[0][:120], inicio)   # marcador com o nome do original
        saida = io.BytesIO()
        w.write(saida)
        return saida.getvalue()
