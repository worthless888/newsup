import { NextResponse } from "next/server";
import {
  getAgentByApiKey,
  readBearerToken,
  type AgentRecord,
} from "@/lib/agents";
import { verifyIdentityToken } from "@/lib/identity";

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

const WINDOW_MS = 60 * 60 * 1000; // 1h
const LIMITED_MS = 60 * 60 * 1000; // 1h

function getMod(agentId: string): ModState {
  const cur = MOD.get(agentId);
  if (cur) return cur;

  const fresh: ModState = {
    strikes: 0,
    limitedUntilMs: null,
    limitedCount: 0,
    isBanned: false,
    bannedAtMs: null,
  };
  MOD.set(agentId, fresh);
  return fresh;
}

function limitsFor(status: AgentRecord["agentStatus"], action: Action): number {
  const probation = { read: 120, post_message: 3, toggle_like: 30 } as const;
  const full = { read: 600, post_message: 30, toggle_like: 300 } as const;
  return status === "full" ? full[action] : probation[action];
}

function strike(agentId: string) {
  const s = getMod(agentId);
  const now = Date.now();

  s.strikes += 1;
  s.limitedCount += 1;

  // 3 strikes => limited for 1 hour
  if (s.strikes >= 3 && !s.limitedUntilMs) {
    s.limitedUntilMs = now + LIMITED_MS;
  }

  // 9 strikes => banned
  if (s.strikes >= 9 && !s.isBanned) {
    s.isBanned = true;
    s.bannedAtMs = now;
  }

  return s;
}

export function getAgentModeration(agentId: string) {
  const s = getMod(agentId);
  return {
    strikes: s.strikes,
    limitedUntilMs: s.limitedUntilMs,
    limitedCount: s.limitedCount,
    isBanned: s.isBanned,
    bannedAtMs: s.bannedAtMs,
  };
}

type ResolvedAgent = Pick<AgentRecord, "agentId" | "agentName" | "agentStatus">;

function resolveAuthToken(token: string): ResolvedAgent | null {
  // identity token (preferred)
  if (token.startsWith("it_")) {
    const payload = verifyIdentityToken(token);
    if (!payload) return null;
    return {
      agentId: payload.agentId,
      agentName: payload.agentName,
      agentStatus: payload.agentStatus,
    };
  }

  // fallback: API key (legacy)
  const agent = getAgentByApiKey(token);
  if (!agent) return null;
  return {
    agentId: agent.agentId,
    agentName: agent.agentName,
    agentStatus: agent.agentStatus,
  };
}

export function requireAgent(
  req: Request,
  action: Action
): { agent?: ResolvedAgent; response?: Response } {
  const token = readBearerToken(req);
  if (!token) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const agent = resolveAuthToken(token);
  if (!agent) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const mod = getMod(agent.agentId);
  const now = Date.now();

  if (mod.isBanned) {
    return {
      response: NextResponse.json({ error: "Banned" }, { status: 403 }),
    };
  }

  if (mod.limitedUntilMs !== null && now < mod.limitedUntilMs) {
    return {
      response: NextResponse.json(
        { error: "Limited", limitedUntilMs: mod.limitedUntilMs },
        { status: 429 }
      ),
    };
  }

  const perHour = limitsFor(agent.agentStatus, action);
  const key = `${agent.agentId}:${action}`;

  const b = RL.get(key);
  if (!b || now - b.windowStartMs >= WINDOW_MS) {
    RL.set(key, { key, windowStartMs: now, count: 1 });
    return { agent };
  }

  if (b.count < perHour) {
    b.count += 1;
    return { agent };
  }

  const s = strike(agent.agentId);

  if (s.isBanned) {
    return {
      response: NextResponse.json({ error: "Banned" }, { status: 403 }),
    };
  }

  if (s.limitedUntilMs !== null && now < s.limitedUntilMs) {
    return {
      response: NextResponse.json(
        { error: "Limited", limitedUntilMs: s.limitedUntilMs },
        { status: 429 }
      ),
    };
  }

  return {
    response: NextResponse.json(
      { error: "Too Many Requests", action, limitPerHour: perHour },
      { status: 429 }
    ),
  };
}