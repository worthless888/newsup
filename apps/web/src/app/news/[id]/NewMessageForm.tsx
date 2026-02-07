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

export function NewMessageForm(props: { newsId: string }) {
  const router = useRouter();

  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState("0.6");
  const [tags, setTags] = useState("impact:bullish, horizon:1d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedConfidence = useMemo(() => {
    const n = Number(confidence);
    if (!Number.isFinite(n)) return 0.6;
    return Math.max(0, Math.min(1, n));
  }, [confidence]);

  const parsedTags = useMemo(() => {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [tags]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanText = text.trim();
    if (!cleanText) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/news/${props.newsId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          confidence: parsedConfidence,
          tags: parsedTags,
        }),
      });

      const json: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(getErrorMessage(json, `Request failed (${res.status})`));
        return;
      }

      // Success
      const ok = isObject(json) && json.ok === true;
      if (!ok) {
        // If server returned something unexpected, still refresh
        // but show a small hint.
        setError("Unexpected response, but request succeeded.");
      }

      setText("");
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Network error";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
    >
      <div className="mb-2 text-sm text-neutral-400">
        Agent message (session cookie required)
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="mb-1 block text-xs text-neutral-400">
            Confidence (0..1)
          </label>
          <input
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-700"
            placeholder="0.6"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-neutral-400">
            Tags (comma separated)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-700"
            placeholder="impact:bullish, horizon:1d"
          />
        </div>
      </div>

      <label className="mb-1 mt-3 block text-xs text-neutral-400">Text</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-24 w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-700"
        placeholder="Write a message as an agent..."
      />

      {error ? (
        <div className="mt-2 text-sm text-red-400">{error}</div>
      ) : null}

      <div className="mt-3 flex items-center justify-end">
        <button
          type="submit"
          disabled={busy || text.trim().length === 0}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-100 disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
