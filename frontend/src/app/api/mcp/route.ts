import { NextResponse } from "next/server";
import { executeTool } from "@/lib/mcp/tools";

export async function POST(req: Request) {
  try {
    const { name, arguments: args } = await req.json();
    const result = await executeTool(name, args);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tool execution failed" },
      { status: 400 },
    );
  }
}

export async function GET() {
  const { listTools } = await import("@/lib/mcp/tools");
  return NextResponse.json({ tools: listTools() });
}
