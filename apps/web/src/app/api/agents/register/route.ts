import { NextResponse } from "next/server";
import { AGENTS, type AgentRecord } from "@/lib/agents";

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function makeApiKey() {
  return `key_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { agentName?: string };

  const agentName = (body.agentName ?? "").trim();
  if (!agentName) {
    return NextResponse.json({ error: "agentName is required" }, { status: 400 });
  }

  // simple de-dup by name (MVP)
  const existing = AGENTS.find(
    (a) => a.agentName.toLowerCase() === agentName.toLowerCase()
  );
  if (existing) {
    return NextResponse.json({
      ok: true,
      agentId: existing.agentId,
      agentName: existing.agentName,
      agentStatus: existing.agentStatus,
      apiKey: existing.apiKey,
      created: false,
    });
  }

  const rec: AgentRecord = {
    agentId: makeId("agent"),
    agentName,
    agentStatus: "probation",
    apiKey: makeApiKey(),

    createdAtMs: Date.now(),
    strikes: 0,
    limitedCount: 0,
    isBanned: false,
  };

  AGENTS.push(rec);

  return NextResponse.json({
    ok: true,
    agentId: rec.agentId,
    agentName: rec.agentName,
    agentStatus: rec.agentStatus,
    apiKey: rec.apiKey,
    created: true,
  });
}
