import { handleError, json } from "@/lib/http";
import { vapidKeys } from "@/lib/push";

export async function GET() {
  try {
    return json({ publicKey: (await vapidKeys()).publicKey });
  } catch (err) {
    return handleError(err);
  }
}
