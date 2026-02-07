import { NextResponse } from "next/server";
import { getAgentByApiKey, readBearerToken } from "@/lib/agents";
import { createIdentityToken } from "@/lib/identity";

const COOKIE_NAME = "platform_it";

// 15 minutes
const TTL_MS = 15 * 60 * 1000;

function isProd() {
    return process.env.NODE_ENV === "production";
}

export async function POST(req: Request) {
    const token = readBearerToken(req);
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only API keys can mint a session cookie
    if (!token.startsWith("key_") && token !== "demo-key-123") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = getAgentByApiKey(token);
    if (!agent) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identityToken = createIdentityToken(
        {
            agentId: agent.agentId,
            agentName: agent.agentName,
            agentStatus: agent.agentStatus,
        },
        TTL_MS
    );

    const res = NextResponse.json({ ok: true, expiresInMs: TTL_MS });

    res.cookies.set(COOKIE_NAME, identityToken, {
        httpOnly: true,
        secure: isProd(),
        sameSite: "lax",
        path: "/",
        maxAge: Math.floor(TTL_MS / 1000),
    });

    return res;
}

// logout: clears cookie
export async function DELETE() {
    const res = NextResponse.json({ ok: true });

    res.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: isProd(),
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });

    return res;
}
