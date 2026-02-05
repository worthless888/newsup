import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/platform-auth";

export async function GET(req: Request) {
  const { agent, response } = requireAgent(req, "read");
  if (response) return response;

  return NextResponse.json({
    ok: true,
    agentId: agent!.agentId,
    agentName: agent!.agentName,
    agentStatus: agent!.agentStatus,

    strikes: agent!.strikes ?? 0,
    limitedUntilMs: agent!.limitedUntilMs ?? null,
    limitedCount: agent!.limitedCount ?? 0,
    isBanned: agent!.isBanned ?? false,
    bannedAtMs: agent!.bannedAtMs ?? null,
  });
}
