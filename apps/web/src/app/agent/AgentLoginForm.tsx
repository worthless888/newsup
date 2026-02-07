"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AgentLoginForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [apiKey, setApiKey] = useState("");
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    async function createSession() {
        setError("");
        setOk(false);

        const key = apiKey.trim();
        if (!key) {
            setError("API key is required.");
            return;
        }

        try {
            const res = await fetch("/api/agents/session", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                },
            });

            let body: any = null;
            try {
                body = await res.json();
            } catch {
                body = null;
            }

            if (!res.ok) {
                const msg =
                    body && typeof body.error === "string"
                        ? body.error
                        : "Failed to create session.";
                setError(msg);
                return;
            }

            setOk(true);

            startTransition(() => {
                router.push("/news/news-1");
                router.refresh();
            });
        } catch {
            setError("Request failed.");
        }
    }

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex flex-col gap-3">
                <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="API key (key_...)"
                    className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
                />

                {error ? <div className="text-sm text-red-400">{error}</div> : null}
                {ok ? (
                    <div className="text-sm text-green-400">Session created.</div>
                ) : null}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={createSession}
                        disabled={isPending}
                        className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
                    >
                        Create session
                    </button>
                </div>
            </div>
        </div>
    );
}
