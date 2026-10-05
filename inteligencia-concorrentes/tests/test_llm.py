from types import SimpleNamespace

from llm import OpenAILLM


class FakeOpenAI:
    def __init__(self, content):
        self.calls = []
        self._content = content
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=self._content))])


def test_complete_chama_chat_completions_em_modo_json():
    fake = FakeOpenAI('{"a": 1}')
    out = OpenAILLM(fake).complete("oi JSON", "gpt-x", 600)
    assert out == '{"a": 1}'
    kw = fake.calls[0]
    assert kw["model"] == "gpt-x" and kw["max_completion_tokens"] == 600
    assert kw["messages"] == [{"role": "user", "content": "oi JSON"}]
    assert kw["response_format"] == {"type": "json_object"}


def test_complete_conteudo_nulo_vira_texto_vazio():
    assert OpenAILLM(FakeOpenAI(None)).complete("p", "m", 10) == ""
