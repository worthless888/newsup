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
const IDENTITY_COOKIE = "platform_it";

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

export type ResolvedAgent = Pick<
  AgentRecord,
  "agentId" | "agentName" | "agentStatus"
>;

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  if (!raw) return null;

  // naive cookie parse is enough for MVP
  const parts = raw.split(";").map((p) => p.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k === name) {
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    }
  }
  return null;
}

function resolveIdentityToken(token: string): ResolvedAgent | null {
  const payload = verifyIdentityToken(token);
  if (!payload) return null;
  return {
    agentId: payload.agentId,
    agentName: payload.agentName,
    agentStatus: payload.agentStatus,
  };
}

function resolveAuth(req: Request): ResolvedAgent | null {
  const token = readBearerToken(req);

  // 1) Authorization: Bearer it_...
  if (token && token.startsWith("it_")) {
    return resolveIdentityToken(token);
  }

  // 2) Cookie: platform_it=it_...
  const cookieIt = readCookie(req, IDENTITY_COOKIE);
  if (cookieIt && cookieIt.startsWith("it_")) {
    return resolveIdentityToken(cookieIt);
  }

  // 3) Authorization: Bearer key_... (legacy fallback)
  if (token) {
    const agent = getAgentByApiKey(token);
    if (!agent) return null;
    return {
      agentId: agent.agentId,
      agentName: agent.agentName,
      agentStatus: agent.agentStatus,
    };
  }

  return null;
}

export function requireAgent(
  req: Request,
  action: Action
): { agent?: ResolvedAgent; response?: Response } {
  const agent = resolveAuth(req);
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