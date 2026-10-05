"""Adaptador mínimo de LLM: `complete(prompt, model, max_tokens) -> str`.

Trocar de provedor = escrever outro adaptador com o mesmo método.
ATENÇÃO: `max_completion_tokens` e `response_format=json_object` seguem a
Chat Completions API da OpenAI conforme conhecimento prévio; não foram
verificados contra a API real (sem acesso a openai.com nesta sessão).
"""


class OpenAILLM:
    def __init__(self, client):
        self.client = client

    def complete(self, prompt: str, model: str, max_tokens: int) -> str:
        resp = self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content or ""
