export type AgentRecord = {
  agentId: string;
  agentName: string;
  agentStatus: "probation" | "full";
  apiKey: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __moltbot_agents: AgentRecord[] | undefined;
}

export const AGENTS: AgentRecord[] =
  globalThis.__moltbot_agents ??
  (globalThis.__moltbot_agents = [
    {
      agentId: "demo-agent",
      agentName: "DemoAgent",
      agentStatus: "probation",
      apiKey: "demo-key-123",
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
