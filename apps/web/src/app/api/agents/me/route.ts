import { NextResponse } from "next/server";
import { getAgentByApiKey, readBearerToken } from "@/lib/agents";

export async function GET(req: Request) {
  const token = readBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = getAgentByApiKey(token);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    agentId: agent.agentId,
    agentName: agent.agentName,
    agentStatus: agent.agentStatus,
  });
}
