import { NextResponse } from "next/server";
import { AGENTS, getAgentByApiKey, readBearerToken, type AgentRecord } from "@/lib/agents";
import { verifyIdentityToken } from "@/lib/identity";

type Action = "read" | "post_message" | "toggle_like";

type Bucket = {
  key: string;
  windowStartMs: number;
  count: number;
};

declare global {
  var __platform_rl: Map<string, Bucket> | undefined;
  var __platform_mod: Map<string, ModState> | undefined;
}

type ModState = {
  strikes: number;
  limitedUntilMs: number | null;
  limitedCount: number;
  isBanned: boolean;
  bannedAtMs: number | null;
};

const RL = globalThis.__platform_rl ?? (globalThis.__platform_rl = new Map());
const MOD = globalThis.__platform_mod ?? (globalThis.__platform_mod = new Map());

function getOrCreateMod(agentId: string): ModState {
  const s = MOD.get(agentId);
  if (s) return s;
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

function getLimits(action: Action, agent: AgentRecord) {
  const isProbation = agent.agentStatus === "probation";

  // You asked for hard limits + bans. Keep conservative for MVP.
  if (action === "read") {
    return { perHour: isProbation ? 120 : 600 };
  }
  if (action === "post_message") {
    return { perHour: isProbation ? 3 : 30 };
  }
  // toggle_like
  return { perHour: isProbation ? 30 : 300 };
}

function nowMs() {
  return Date.now();
}

function rateKey(agentId: string, action: Action) {
  return `${agentId}:${action}`;
}

function checkRate(agent: AgentRecord, action: Action): { ok: true } | { ok: false; response: Response } {
  const mod = getOrCreateMod(agent.agentId);

  if (mod.isBanned) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Banned" }, { status: 403 }),
    };
  }

  if (mod.limitedUntilMs !== null && nowMs() < mod.limitedUntilMs) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Limited", limitedUntilMs: mod.limitedUntilMs },
        { status: 429 }
      ),
    };
  }

  const { perHour } = getLimits(action, agent);

  const key = rateKey(agent.agentId, action);
  const windowMs = 60 * 60 * 1000;

  const b = RL.get(key);
  const t = nowMs();

  if (!b || t - b.windowStartMs >= windowMs) {
    RL.set(key, { key, windowStartMs: t, count: 1 });
    return { ok: true };
  }

  b.count += 1;

  if (b.count <= perHour) return { ok: true };

  // strike escalation
  mod.strikes += 1;

  if (mod.strikes >= 3) {
    mod.limitedUntilMs = t + 60 * 60 * 1000; // 1h limited
    mod.limitedCount += 1;
  }

  if (mod.limitedCount >= 3) {
    mod.isBanned = true;
    mod.bannedAtMs = t;
    return {
      ok: false,
      response: NextResponse.json({ error: "Banned" }, { status: 403 }),
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "Too Many Requests",
        action,
        limitPerHour: perHour,
        strikes: mod.strikes,
        limitedUntilMs: mod.limitedUntilMs,
        isBanned: mod.isBanned,
      },
      { status: 429 }
    ),
  };
}

function readIdentityHeader(req: Request): string | null {
  const h = req.headers.get("x-platform-identity");
  return h?.trim() ? h.trim() : null;
}

function getAgentByIdentity(req: Request): AgentRecord | null {
  const token = readIdentityHeader(req);
  if (!token) return null;

  const secret = process.env.PLATFORM_IDENTITY_SECRET ?? "dev-secret-change-me";
  const v = verifyIdentityToken(token, secret);
  if (!v.ok) return null;

  const agent = AGENTS.find((a) => a.agentId === v.agentId);
  return agent ?? null;
}

export function requireAgent(
  req: Request,
  action: Action
): { agent: AgentRecord | null; response: Response | null } {
  // Preferred: identity token
  const byIdentity = getAgentByIdentity(req);
  if (byIdentity) {
    const r = checkRate(byIdentity, action);
    if (!r.ok) return { agent: byIdentity, response: r.response };
    return { agent: byIdentity, response: null };
  }

  // Backward compatibility for now: Bearer API key (we will remove later)
  const bearer = readBearerToken(req);
  if (bearer) {
    const a = getAgentByApiKey(bearer);
    if (a) {
      const r = checkRate(a, action);
      if (!r.ok) return { agent: a, response: r.response };
      return { agent: a, response: null };
    }
  }

  return {
    agent: null,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

export function getModerationState(agentId: string) {
  const s = getOrCreateMod(agentId);
  return {
    strikes: s.strikes,
    limitedUntilMs: s.limitedUntilMs,
    limitedCount: s.limitedCount,
    isBanned: s.isBanned,
    bannedAtMs: s.bannedAtMs,
  };
}
