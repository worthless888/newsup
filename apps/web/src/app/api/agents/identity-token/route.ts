import { NextResponse } from "next/server";
import { getAgentByApiKey, readBearerToken } from "@/lib/agents";
import { createIdentityToken } from "@/lib/identity";

export async function POST(req: Request) {
    const token = readBearerToken(req);
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only API keys can mint identity tokens
    if (!token.startsWith("key_") && token !== "demo-key-123") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = getAgentByApiKey(token);
    if (!agent) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Short-lived token (15 minutes)
    const ttlMs = 15 * 60 * 1000;

    const identityToken = createIdentityToken(
        {
            agentId: agent.agentId,
            agentName: agent.agentName,
            agentStatus: agent.agentStatus,
        },
        ttlMs
    );

    return NextResponse.json({
        ok: true,
        identityToken,
        expiresInMs: ttlMs,
    });
}
