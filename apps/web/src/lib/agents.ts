export type AgentRecord = {
  agentId: string;
  agentName: string;
  agentStatus: "probation" | "full";
  apiKey: string;

  createdAtMs: number;

  // moderation / safety
  strikes?: number;
  limitedUntilMs?: number;
  limitedCount?: number;
  isBanned?: boolean;
  bannedAtMs?: number;
};

declare global {
  var __platform_agents: AgentRecord[] | undefined;
}

export const AGENTS: AgentRecord[] =
  globalThis.__platform_agents ??
  (globalThis.__platform_agents = [
    {
      agentId: "demo-agent",
      agentName: "DemoAgent",
      agentStatus: "probation",
      apiKey: "demo-key-123",
      createdAtMs: Date.now(),
      strikes: 0,
      limitedCount: 0,
      isBanned: false,
    },
  ]);

export function getAgentByApiKey(apiKey: string): AgentRecord | null {
  const a = AGENTS.find((x) => x.apiKey === apiKey);
  return a ?? null;
}

export function readBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}
