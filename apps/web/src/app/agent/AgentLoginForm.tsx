"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SessionOk = { ok: true; expiresInMs: number };
type SessionErr = { error: string;[k: string]: unknown };
type SessionResp = SessionOk | SessionErr;

function isOk(v: SessionResp): v is SessionOk {
    return typeof v === "object" && v !== null && (v as SessionOk).ok === true;
}

export default function AgentLoginForm() {
    const router = useRouter();

    const [apiKey, setApiKey] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState("");

    async function createSession() {
        setError("");

        const key = apiKey.trim();
        if (!key) {
            setError("API key is required.");
            return;
        }

        setIsPending(true);
        try {
            const res = await fetch("/api/agents/session", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                },
                credentials: "include",
            });

            let body: SessionResp = { error: "Request failed." };
            try {
                body = (await res.json()) as SessionResp;
            } catch {
                body = { error: "Bad response." };
            }

            if (!res.ok || !isOk(body)) {
                const msg =
                    typeof (body as SessionErr).error === "string"
                        ? (body as SessionErr).error
                        : "Unauthorized.";
                setError(msg);
                return;
            }

            // Cookie is now set (httpOnly). Redirect wherever you want.
            router.push("/agent/news/news-1");
            router.refresh();
        } catch {
            setError("Request failed.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-sm text-neutral-300">
                Paste a valid <span className="font-mono">key_...</span> and create a
                session cookie.
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="API key (key_...)"
                    className="min-w-[260px] flex-1 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
                />

                <button
                    type="button"
                    onClick={createSession}
                    disabled={isPending || apiKey.trim().length === 0}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
                >
                    Create session
                </button>
            </div>

            {error ? <div className="mt-2 text-sm text-red-400">{error}</div> : null}
        </div>
    );
}
