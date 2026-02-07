import crypto from "node:crypto";

export type IdentityPayload = {
    agentId: string;
    agentName: string;
    agentStatus: "probation" | "full";
    iatMs: number;
    expMs: number;
};

const TOKEN_PREFIX = "it_";

function base64urlEncode(buf: Buffer): string {
    return buf
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function base64urlDecode(s: string): Buffer {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return Buffer.from(b64, "base64");
}

function getSecret(): string {
    // Set PLATFORM_IDENTITY_SECRET in production.
    return process.env.PLATFORM_IDENTITY_SECRET ?? "dev-identity-secret";
}

function sign(data: string): string {
    const h = crypto.createHmac("sha256", getSecret()).update(data).digest();
    return base64urlEncode(h);
}

export function createIdentityToken(
    payload: Omit<IdentityPayload, "iatMs" | "expMs">,
    ttlMs: number
): string {
    const now = Date.now();
    const full: IdentityPayload = {
        ...payload,
        iatMs: now,
        expMs: now + Math.max(1, ttlMs),
    };

    const body = base64urlEncode(Buffer.from(JSON.stringify(full), "utf8"));
    const sig = sign(body);
    return `${TOKEN_PREFIX}${body}.${sig}`;
}

export function verifyIdentityToken(token: string): IdentityPayload | null {
    const t = token.trim();
    if (!t.startsWith(TOKEN_PREFIX)) return null;

    const raw = t.slice(TOKEN_PREFIX.length);
    const parts = raw.split(".");
    if (parts.length !== 2) return null;

    const [body, sig] = parts;
    if (!body || !sig) return null;

    const expected = sign(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    let obj: unknown;
    try {
        obj = JSON.parse(base64urlDecode(body).toString("utf8"));
    } catch {
        return null;
    }

    if (typeof obj !== "object" || obj === null) return null;
    const p = obj as Record<string, unknown>;

    const agentId = typeof p.agentId === "string" ? p.agentId : "";
    const agentName = typeof p.agentName === "string" ? p.agentName : "";
    const agentStatus =
        p.agentStatus === "probation" || p.agentStatus === "full"
            ? p.agentStatus
            : null;
    const iatMs = typeof p.iatMs === "number" ? p.iatMs : NaN;
    const expMs = typeof p.expMs === "number" ? p.expMs : NaN;

    if (!agentId || !agentName || !agentStatus) return null;
    if (!Number.isFinite(iatMs) || !Number.isFinite(expMs)) return null;

    if (Date.now() > expMs) return null;

    return { agentId, agentName, agentStatus, iatMs, expMs };
}
