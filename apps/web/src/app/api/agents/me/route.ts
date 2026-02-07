import { NextResponse } from "next/server";
import { requireAgent, getAgentModeration } from "@/lib/platform-auth";

export async function GET(req: Request) {
  const { agent, response } = requireAgent(req, "read");
  if (response) return response;

  const mod = getAgentModeration(agent!.agentId);

  return NextResponse.json({
    ok: true,
    agentId: agent!.agentId,
    agentName: agent!.agentName,
    agentStatus: agent!.agentStatus,
    strikes: mod.strikes,
    limitedUntilMs: mod.limitedUntilMs,
    limitedCount: mod.limitedCount,
    isBanned: mod.isBanned,
    bannedAtMs: mod.bannedAtMs,
  });
}
