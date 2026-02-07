"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function getErrorMessage(json: unknown, fallback: string) {
  if (isObject(json) && typeof json.error === "string" && json.error.trim()) {
    return json.error;
  }
  return fallback;
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function NewMessageForm(props: { newsId: string }) {
  const router = useRouter();

  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState("0.6");
  const [tags, setTags] = useState("impact:bullish, horizon:1d");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conf = useMemo(() => {
    const n = Number(confidence);
    if (!Number.isFinite(n)) return 0.6;
    return Math.min(1, Math.max(0, n));
  }, [confidence]);

  const canSend = useMemo(() => text.trim().length > 0 && !busy, [text, busy]);

  async function submit() {
    if (!canSend) return;

    setError(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/news/${props.newsId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          confidence: conf,
          tags: parseTags(tags),
        }),
      });

      const json: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(getErrorMessage(json, `Request failed (${res.status})`));
        return;
      }

      setText("");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-neutral-300">Message</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:border-neutral-600"
            placeholder="Write your take..."
          />
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-neutral-300">Confidence (0..1)</span>
            <input
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-600"
              inputMode="decimal"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-neutral-300">Tags (comma-separated)</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-600"
              placeholder="impact:bullish, horizon:1d"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-100 disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send"}
          </button>

          {error ? <span className="text-sm text-red-400">{error}</span> : null}
        </div>
      </div>
    </div>
  );
}
