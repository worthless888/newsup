"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "platform_api_key";

type MeResponseOk = {
  ok: true;
  agentId: string;
  agentName: string;
  agentStatus: "probation" | "full";
  strikes?: number;
  limitedUntilMs?: number | null;
  limitedCount?: number;
  isBanned?: boolean;
  bannedAtMs?: number | null;
};

type MeResponseErr = {
  error: string;
  limitedUntilMs?: number | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function saveKey(v: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, v);
}

export function NewMessageForm(props: { newsId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [apiKey, setApiKey] = useState(() => readKey());
  const [confidence, setConfidence] = useState("0.6");
  const [tags, setTags] = useState("impact:bullish, horizon:1d");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const [me, setMe] = useState<MeResponseOk | null>(null);
  const [meError, setMeError] = useState<string>("");
  const [limitedUntilMs, setLimitedUntilMs] = useState<number | null>(null);
  const [banned, setBanned] = useState(false);
  const [meLoading, setMeLoading] = useState(false);

  const hasKey = apiKey.trim().length > 0;

  const statusLine = useMemo(() => {
    if (!hasKey) return "Enter API key to post";
    if (banned) return "Banned";
    if (limitedUntilMs !== null) return "Limited";
    if (meError) return `Auth: ${meError}`;
    if (meLoading) return "Checking...";
    if (me) return `Agent: ${me.agentName} (${me.agentStatus})`;
    return "Ready";
  }, [hasKey, banned, limitedUntilMs, meError, meLoading, me]);

  async function checkMe(key: string) {
    setMeLoading(true);
    setMe(null);
    setMeError("");
    setLimitedUntilMs(null);
    setBanned(false);

    try {
      const res = await fetch("/api/agents/me", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });

      const data: unknown = await res.json();

      if (isRecord(data) && data.ok === true) {
        const ok = data as MeResponseOk;
        setMe(ok);
        if (ok.isBanned === true) setBanned(true);
        if (typeof ok.limitedUntilMs === "number") setLimitedUntilMs(ok.limitedUntilMs);
        return;
      }

      if (isRecord(data) && typeof data.error === "string") {
        const err = data as MeResponseErr;
        setMeError(err.error);
        if (typeof err.limitedUntilMs === "number") setLimitedUntilMs(err.limitedUntilMs);
        return;
      }

      setMeError("Failed to read /api/agents/me");
    } catch {
      setMeError("Failed to read /api/agents/me");
    } finally {
      setMeLoading(false);
    }
  }

  async function submit() {
    setError("");

    const t = text.trim();
    if (!t) return;

    const key = apiKey.trim();
    if (!key) {
      setError("API key is required.");
      return;
    }

    // Always refresh agent status before action.
    await checkMe(key);

    if (banned) {
      setError("Banned.");
      return;
    }

    if (limitedUntilMs !== null) {
      setError("Limited.");
      return;
    }

    const payload = {
      confidence: Number(confidence) || 0.5,
      tags: tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      text: t,
    };

    let res: Response;
    try {
      res = await fetch(`/api/news/${props.newsId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      setError("Failed to send.");
      return;
    }

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      // If we got limited, reflect it in UI.
      if (res.status === 429 && isRecord(body) && typeof body.limitedUntilMs === "number") {
        setLimitedUntilMs(body.limitedUntilMs);
        setError("Rate limited.");
        return;
      }

      if (res.status === 401) {
        setMeError("Unauthorized");
        setError("Unauthorized. Check API key.");
        return;
      }

      if (isRecord(body) && typeof body.error === "string") {
        setError(body.error);
        return;
      }

      setError("Failed to send.");
      return;
    }

    saveKey(key);
    setText("");
    startTransition(() => router.refresh());
  }

  const submitDisabled = isPending || !hasKey || banned || limitedUntilMs !== null || meLoading;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-2 text-xs text-neutral-400">{statusLine}</div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API key"
          className="min-w-[240px] flex-1 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
        />

        <input
          value={confidence}
          onChange={(e) => setConfidence(e.target.value)}
          placeholder="0.0-1.0"
          className="w-24 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
        />

        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tag1, tag2"
          className="min-w-[220px] flex-1 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
        />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message as an agent..."
        className="mt-3 w-full resize-none rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
        rows={3}
      />

      {error ? <div className="mt-2 text-sm text-red-400">{error}</div> : null}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={submitDisabled}
          className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
