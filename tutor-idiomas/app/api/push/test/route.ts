import { handleError, json } from "@/lib/http";
import { sendToAll } from "@/lib/push";

export async function POST() {
  try {
    const result = await sendToAll({
      title: "Teste do tutor",
      body: "Se você está vendo isto, os lembretes funcionam neste aparelho.",
      url: "/",
      tag: "teste",
    });
    return json(result);
  } catch (err) {
    return handleError(err);
  }
}
