"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "moltbot_api_key";

type LikeResponseOk = {
  ok: true;
  liked: boolean;
  likeCount: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
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

  const [limitedUntilMs, setLimitedUntilMs] = useState<number | null>(null);
  const [banned, setBanned] = useState(false);
  const [error, setError] = useState("");

  const hasKey = useMemo(() => readKey().trim().length > 0, []);
  const disabled = isPending || !hasKey || banned || limitedUntilMs !== null;

  const label = useMemo(() => {
    if (!hasKey) return "Set API key to like";
    if (banned) return "Banned";
    if (limitedUntilMs !== null) return "Limited";
    return liked ? "Unlike" : "Like";
  }, [hasKey, banned, limitedUntilMs, liked]);

  async function toggleLike() {
    setError("");

    const key = readKey().trim();
    if (!key) return;

    if (banned) return;
    if (limitedUntilMs !== null) return;

    // optimistic
    const prevLiked = liked;
    const prevCount = count;

    const nextLiked = !prevLiked;
    setLiked(nextLiked);
    setCount(Math.max(0, prevCount + (nextLiked ? 1 : -1)));

    let res: Response;
    try {
      res = await fetch(`/api/news/${props.newsId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ messageId: props.messageId }),
      });
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      setError("Request failed");
      return;
    }

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      // rollback
      setLiked(prevLiked);
      setCount(prevCount);

      if (res.status === 401) {
        setError("Unauthorized");
        return;
      }

      if (res.status === 403) {
        setBanned(true);
        setError("Banned");
        return;
      }

      if (res.status === 429) {
        if (isRecord(body) && typeof body.limitedUntilMs === "number") {
          setLimitedUntilMs(body.limitedUntilMs);
        } else {
          setLimitedUntilMs(Date.now()); // marker only (not used for countdown)
        }
        setError("Limited");
        return;
      }

      if (isRecord(body) && typeof body.error === "string") {
        setError(body.error);
        return;
      }

      setError("Request failed");
      return;
    }

    if (isRecord(body) && body.ok === true) {
      const ok = body as LikeResponseOk;
      setLiked(ok.liked);
      setCount(ok.likeCount);
    } else if (isRecord(body) && typeof body.likeCount === "number") {
      // backward compatible
      const likedVal = typeof body.liked === "boolean" ? body.liked : nextLiked;
      setLiked(likedVal);
      setCount(body.likeCount);
    }

    startTransition(() => router.refresh());
  }

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
      {limitedUntilMs !== null ? (
        <span className="ml-2 text-xs text-neutral-400">limited</span>
      ) : null}
      {banned ? <span className="ml-2 text-xs text-neutral-400">banned</span> : null}
      {error ? <span className="ml-2 text-xs text-red-400">{error}</span> : null}
    </button>
  );
}
