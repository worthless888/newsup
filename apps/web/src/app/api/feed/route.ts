import { NextResponse } from "next/server";
import { FEED } from "@/lib/mock-data";
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

  return NextResponse.json({ feed: FEED });
}
