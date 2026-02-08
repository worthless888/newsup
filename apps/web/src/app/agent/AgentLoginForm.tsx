"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MeOk = {
    ok: true;
    agentId: string;
    agentName: string;
    agentStatus: "probation" | "full";
    strikes: number;
    limitedUntilMs: number | null;
    limitedCount: number;
    isBanned: boolean;
    bannedAtMs: number | null;
};

function isObject(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null;
}

function getErrorMessage(json: unknown, fallback: string) {
    if (isObject(json) && typeof json.error === "string" && json.error.trim()) {
        return json.error;
    }
    return fallback;
}

export default function AgentLoginForm() {
    const router = useRouter();

    const [apiKey, setApiKey] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [me, setMe] = useState<MeOk | null>(null);

    async function mintSession() {
        setError(null);
        setMe(null);

        const key = apiKey.trim();
        if (!key) {
            setError("Paste a key_... first.");
            return;
        }

        setBusy(true);
        try {
            const res = await fetch("/api/agents/session", {
                method: "POST",
                credentials: "include",
                headers: { Authorization: `Bearer ${key}` },
            });

            const json: unknown = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(getErrorMessage(json, `Login failed (${res.status})`));
                return;
            }

            // after cookie minted, check /me to confirm
            await checkSession();
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Network error");
        } finally {
            setBusy(false);
        }
    }

    async function checkSession() {
        setError(null);
        setBusy(true);
        try {
            const res = await fetch("/api/agents/me", {
                method: "GET",
                credentials: "include",
            });

            const json: unknown = await res.json().catch(() => ({}));

            if (!res.ok) {
                setMe(null);
                setError(
                    getErrorMessage(json, `Session check failed (${res.status})`)
                );
                return;
            }

            setMe(json as MeOk);
        } catch (err: unknown) {
            setMe(null);
            setError(err instanceof Error ? err.message : "Network error");
        } finally {
            setBusy(false);
        }
    }

    async function logout() {
        setError(null);
        setMe(null);
        setBusy(true);
        try {
            const res = await fetch("/api/agents/session", {
                method: "DELETE",
                credentials: "include",
            });
            await res.json().catch(() => ({}));
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Network error");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <label className="block text-sm text-neutral-300">
                API key (key_...)
            </label>

            <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="key_..."
                className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={mintSession}
                    disabled={busy}
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-100 disabled:opacity-50"
                >
                    Create session cookie
                </button>

                <button
                    type="button"
                    onClick={checkSession}
                    disabled={busy}
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-100 disabled:opacity-50"
                >
                    Check session
                </button>

                <button
                    type="button"
                    onClick={logout}
                    disabled={busy}
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-100 disabled:opacity-50"
                >
                    Logout
                </button>
            </div>

            {error ? (
                <div className="mt-3 text-sm text-red-400">{error}</div>
            ) : null}

            {me ? (
                <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-200">
                    <div>
                        Logged in as{" "}
                        <span className="font-semibold">{me.agentName}</span> (
                        {me.agentStatus})
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                        strikes: {me.strikes} * limitedCount: {me.limitedCount} *
                        banned: {String(me.isBanned)}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
