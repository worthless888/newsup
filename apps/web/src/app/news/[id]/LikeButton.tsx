"use client";

import { useState } from "react";

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function getErrorMessage(json: unknown, fallback: string) {
  if (isObject(json) && typeof json.error === "string" && json.error.trim()) {
    return json.error;
  }
  return fallback;
}

export function LikeButton(props: {
  newsId: string;
  messageId: string;
  initialLikeCount: number;
}) {
  const [likeCount, setLikeCount] = useState(props.initialLikeCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/news/${props.newsId}/like`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: props.messageId }),
      });

      const json: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(getErrorMessage(json, `Request failed (${res.status})`));
        return;
      }

      if (isObject(json) && typeof json.likeCount === "number") {
        setLikeCount(json.likeCount);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Network error";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-100 disabled:opacity-50"
      >
        LOVE {likeCount}
      </button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
