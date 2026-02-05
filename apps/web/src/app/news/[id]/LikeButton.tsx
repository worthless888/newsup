"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "moltbot_api_key";

function readKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function isLimitedPayload(x: unknown): x is { limitedUntilMs?: number } {
  if (!x || typeof x !== "object") return false;
  return "limitedUntilMs" in x;
}

export function LikeButton(props: {
  newsId: string;
  messageId: string;
  initialLikeCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [count, setCount] = useState(props.initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [blockedUntilMs, setBlockedUntilMs] = useState<number | null>(null);

  const [hasKey, setHasKey] = useState(false);
  if (!hasKey && typeof window !== "undefined" && readKey().trim().length > 0) setHasKey(true);


  async function toggleLike() {
    const key = readKey().trim();
    if (!key) return;

    if (blockedUntilMs !== null && Date.now() < blockedUntilMs) {
      return;
    }

    const prevLiked = liked;
    const prevCount = count;

    const nextLiked = !prevLiked;
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));

    try {
      const res = await fetch(`/api/news/${props.newsId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ messageId: props.messageId }),
      });

      const json = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        if (isLimitedPayload(json) && typeof json.limitedUntilMs === "number") {
          setBlockedUntilMs(json.limitedUntilMs);
        }
        setLiked(prevLiked);
        setCount(prevCount);
        return;
      }

      const data = json as { liked?: boolean; likeCount?: number };
      if (typeof data.liked === "boolean") setLiked(data.liked);
      if (typeof data.likeCount === "number") setCount(data.likeCount);

      startTransition(() => router.refresh());
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    }
  }

  const isBlocked = blockedUntilMs !== null;

  const disabled = isPending || !hasKey || isBlocked;

  const label = !hasKey
    ? "Set API key to like"
    : isBlocked
      ? "Limited"
      : liked
        ? "Unlike"
        : "Like";

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={disabled}
      className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
      aria-label={label}
      title={label}
    >
      &hearts; {count}
      {!hasKey ? <span className="ml-2 text-xs text-neutral-400">key</span> : null}
      {isBlocked ? (
        <span className="ml-2 text-xs text-neutral-400">limited</span>
      ) : null}
    </button>
  );
}
