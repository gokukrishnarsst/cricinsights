import { runCricAgent } from "@/lib/agent";

/** @deprecated Use runCricAgent */
export async function runCricChat(
  messages: { role: "user" | "assistant"; content: string }[],
) {
  const result = await runCricAgent({ messages });
  return { text: result.text, ui: result.ui };
}
