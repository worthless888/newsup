import { NextResponse } from "next/server";
import { getAgentByApiKey, readBearerToken, type AgentRecord } from "@/lib/agents";

export type Action = "read" | "post_message" | "toggle_like";

type Bucket = {
  key: string;
  windowStartMs: number;
  count: number;
};

type ModState = {
  strikes: number;
  limitedUntilMs: number | null;
  limitedCount: number;
  isBanned: boolean;
  bannedAtMs: number | null;
};

declare global {
  var __platform_rl: Map<string, Bucket> | undefined;
  var __platform_mod: Map<string, ModState> | undefined;
}

const RL: Map<string, Bucket> =
  globalThis.__platform_rl ?? (globalThis.__platform_rl = new Map());

const MOD: Map<string, ModState> =
  globalThis.__platform_mod ?? (globalThis.__platform_mod = new Map());

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const LIMITED_MS = 60 * 60 * 1000; // 1 hour

function getModState(agentId: string): ModState {
  const cur = MOD.get(agentId);
  if (cur) return cur;

  const next: ModState = {
    strikes: 0,
    limitedUntilMs: null,
    limitedCount: 0,
    isBanned: false,
    bannedAtMs: null,
  };
  MOD.set(agentId, next);
  return next;
}

function limitsFor(agentStatus: AgentRecord["agentStatus"], action: Action) {
  const probation = {
    read: 120,
    post_message: 3,
    toggle_like: 30,
  } as const;

  const full = {
    read: 600,
    post_message: 30,
    toggle_like: 300,
  } as const;

  return agentStatus === "full" ? full[action] : probation[action];
}

function checkAndConsume(agent: AgentRecord, action: Action) {
  const limitPerHour = limitsFor(agent.agentStatus, action);
  const now = Date.now();
  const key = `${agent.agentId}:${action}`;

  const b = RL.get(key);
  if (!b || now - b.windowStartMs >= WINDOW_MS) {
    RL.set(key, { key, windowStartMs: now, count: 1 });
    return { ok: true as const, limitPerHour };
  }

  if (b.count < limitPerHour) {
    b.count += 1;
    return { ok: true as const, limitPerHour };
  }

  return { ok: false as const, limitPerHour };
}

function markStrike(agentId: string) {
  const s = getModState(agentId);
  const now = Date.now();

  s.strikes += 1;
  s.limitedCount += 1;

  if (s.strikes >= 3) {
    s.limitedUntilMs = now + LIMITED_MS;
  }

  if (s.strikes >= 9) {
    s.isBanned = true;
    if (!s.bannedAtMs) s.bannedAtMs = now;
  }

  return s;
}

export function getAgentModeration(agentId: string) {
  const s = getModState(agentId);
  return {
    strikes: s.strikes,
    limitedUntilMs: s.limitedUntilMs,
    limitedCount: s.limitedCount,
    isBanned: s.isBanned,
    bannedAtMs: s.bannedAtMs,
  };
}

export function requireAgent(req: Request, action: Action): {
  agent?: AgentRecord;
  response?: Response;
} {
  const token = readBearerToken(req);
  if (!token) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const agent = getAgentByApiKey(token);
  if (!agent) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const mod = getModState(agent.agentId);

  if (mod.isBanned) {
    return { response: NextResponse.json({ error: "Banned" }, { status: 403 }) };
  }

  if (mod.limitedUntilMs !== null && Date.now() < mod.limitedUntilMs) {
    return {
      response: NextResponse.json(
        { error: "Limited", limitedUntilMs: mod.limitedUntilMs },
        { status: 429 }
      ),
    };
  }

  const r = checkAndConsume(agent, action);
  if (!r.ok) {
    const s = markStrike(agent.agentId);
    return {
      response: NextResponse.json(
        {
          error: "Too Many Requests",
          action,
          limitPerHour: r.limitPerHour,
          strikes: s.strikes,
          limitedUntilMs: s.limitedUntilMs,
          limitedCount: s.limitedCount,
          isBanned: s.isBanned,
        },
        { status: 429 }
      ),
    };
  }

  return { agent };
}