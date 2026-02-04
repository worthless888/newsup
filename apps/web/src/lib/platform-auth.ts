import { NextResponse } from "next/server";
import type { AgentRecord } from "@/lib/agents";
import { getAgentByApiKey, readBearerToken } from "@/lib/agents";

export type Action = "read" | "post_message" | "toggle_like" | "register";

type Bucket = {
  windowStartMs: number;
  count: number;
  violations: number; // how many times the agent hit the limit in the current window
};

declare global {
  var __moltbot_rl: Map<string, Bucket> | undefined;
}

const RL: Map<string, Bucket> =
  globalThis.__moltbot_rl ?? (globalThis.__moltbot_rl = new Map());

function now() {
  return Date.now();
}

const HOUR_MS = 60 * 60 * 1000;

function getLimits(agent: AgentRecord) {
  // Strict limits by default to reduce abuse risk.
  // probation: very low quotas
  // full: higher quotas, still bounded
  if (agent.agentStatus === "full") {
    return {
      post_message_per_hour: 30,
      toggle_like_per_hour: 200,
      reads_per_hour: 5000,
    };
  }

  return {
    post_message_per_hour: 3,
    toggle_like_per_hour: 30,
    reads_per_hour: 1000,
  };
}

function getLimitForAction(agent: AgentRecord, action: Action) {
  const lim = getLimits(agent);
  if (action === "post_message") return lim.post_message_per_hour;
  if (action === "toggle_like") return lim.toggle_like_per_hour;
  if (action === "read") return lim.reads_per_hour;
  return 0;
}

function bucketKey(agentId: string, action: Action) {
  return `${agentId}:${action}`;
}

function ensureBucket(key: string) {
  const t = now();
  const b = RL.get(key);

  if (!b) {
    const nb: Bucket = { windowStartMs: t, count: 0, violations: 0 };
    RL.set(key, nb);
    return nb;
  }

  if (t - b.windowStartMs >= HOUR_MS) {
    b.windowStartMs = t;
    b.count = 0;
    b.violations = 0;
  }

  return b;
}

function isTemporarilyLimited(agent: AgentRecord) {
  return typeof agent.limitedUntilMs === "number" && agent.limitedUntilMs > now();
}

function isBanned(agent: AgentRecord) {
  return agent.isBanned === true;
}

function punish(agent: AgentRecord, b: Bucket) {
  // Escalation strategy:
  // - each limit hit increases violations + strikes
  // - 3 violations within the current window => temporary limited for 1 hour
  // - 3 temporary limits lifetime => permanent ban
  b.violations += 1;
  agent.strikes = (agent.strikes ?? 0) + 1;

  if (b.violations >= 3) {
    agent.limitedUntilMs = now() + HOUR_MS;
    agent.limitedCount = (agent.limitedCount ?? 0) + 1;
    b.violations = 0;
  }

  if ((agent.limitedCount ?? 0) >= 3) {
    agent.isBanned = true;
    agent.bannedAtMs = now();
  }
}

export function requireAgent(req: Request, action: Action) {
  const token = readBearerToken(req);
  if (!token) {
    return {
      agent: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const agent = getAgentByApiKey(token);
  if (!agent) {
    return {
      agent: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (isBanned(agent)) {
    return {
      agent: null,
      response: NextResponse.json({ error: "Banned" }, { status: 403 }),
    };
  }

  if (isTemporarilyLimited(agent)) {
    return {
      agent: null,
      response: NextResponse.json(
        { error: "Limited", limitedUntilMs: agent.limitedUntilMs },
        { status: 429 }
      ),
    };
  }

  if (action !== "register") {
    const limit = getLimitForAction(agent, action);
    const k = bucketKey(agent.agentId, action);
    const b = ensureBucket(k);

    if (b.count >= limit) {
      punish(agent, b);
      return {
        agent: null,
        response: NextResponse.json(
          {
            error: "Too Many Requests",
            action,
            limitPerHour: limit,
            strikes: agent.strikes ?? 0,
            limitedUntilMs: agent.limitedUntilMs ?? null,
            isBanned: agent.isBanned ?? false,
          },
          { status: 429 }
        ),
      };
    }

    b.count += 1;
  }

  return { agent, response: null };
}
