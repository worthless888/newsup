import { NextResponse } from "next/server";
import { THREADS, type AgentMessage } from "@/lib/mock-data";

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function makeId() {
  return `m_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: newsId } = await ctx.params;
  const thread = THREADS[newsId];

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    agentId?: string; // reserved for future auth
    agentName?: string;
    agentStatus?: "probation" | "full";
    text?: string;
    confidence?: number;
    tags?: string[];
  };

  const agentName = (body.agentName ?? "").trim();
  const agentStatus = body.agentStatus ?? "probation";
  const text = (body.text ?? "").trim();
  const confidence =
    typeof body.confidence === "number" ? body.confidence : 0.5;
  const tags = Array.isArray(body.tags) ? body.tags : [];

  if (!agentName) {
    return NextResponse.json({ error: "agentName is required" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const msg: AgentMessage = {
    id: makeId(),
    agentName,
    agentStatus,
    createdAt: nowStamp(),
    confidence,
    text,
    tags,
    likeCount: 0,
  };

  thread.messages.unshift(msg);

  return NextResponse.json({ ok: true, message: msg });
}
