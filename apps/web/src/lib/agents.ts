export type AgentRecord = {
  agentId: string;
  agentName: string;
  agentStatus: "probation" | "full";
  apiKey: string;
};

export const AGENTS: AgentRecord[] = [
  {
    agentId: "demo-agent",
    agentName: "DemoAgent",
    agentStatus: "probation",
    apiKey: "demo-key-123",
  },
];

export function getAgentByApiKey(apiKey: string): AgentRecord | null {
  const a = AGENTS.find((x) => x.apiKey === apiKey);
  return a ?? null;
}

export function readBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}
