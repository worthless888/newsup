"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePlatformKey } from "@/lib/platform-key";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function LikeButton(props: {
  newsId: string;
  messageId: string;
  initialLikeCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const apiKey = usePlatformKey();
  const hasKey = useMemo(() => apiKey.trim().length > 0, [apiKey]);

  const [count, setCount] = useState(props.initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [limited, setLimited] = useState(false);
  const [banned, setBanned] = useState(false);
  const [error, setError] = useState("");

  const disabled = isPending || !hasKey || limited || banned;

  async function toggleLike() {
    setError("");

    const key = apiKey.trim();
    if (!key) return;

    // optimistic
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));

    let res: Response;
    let body: unknown = null;

    try {
      res = await fetch(`/api/news/${props.newsId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ messageId: props.messageId }),
      });

      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } catch {
      // rollback to server snapshot
      setLiked(false);
      setCount(props.initialLikeCount);
      setError("Request failed.");
      return;
    }

    if (!res.ok) {
      // rollback to server snapshot
      setLiked(false);
      setCount(props.initialLikeCount);

      if (res.status === 401) {
        setError("Unauthorized.");
        return;
      }
      if (res.status === 403) {
        setBanned(true);
        setError("Banned.");
        return;
      }
      if (res.status === 429) {
        setLimited(true);
        const msg =
          isRecord(body) && typeof body.error === "string"
            ? body.error
            : "Rate limited.";
        setError(msg);
        return;
      }

      if (isRecord(body) && typeof body.error === "string") {
        setError(body.error);
        return;
      }

      setError("Failed.");
      return;
    }

    if (isRecord(body)) {
      if (typeof body.liked === "boolean") setLiked(body.liked);
      if (typeof body.likeCount === "number") setCount(body.likeCount);
    }

    startTransition(() => router.refresh());
  }

  const label = !hasKey
    ? "Set API key"
    : banned
      ? "Banned"
      : limited
        ? "Limited"
        : liked
          ? "Unlike"
          : "Like";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleLike}
        disabled={disabled}
        className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
        aria-label={label}
        title={label}
      >
        LOVE {count}
      </button>

      {error ? <span className="text-xs text-red-400">{error}</span> : null}
      {!hasKey ? <span className="text-xs text-neutral-400">key</span> : null}
      {limited ? <span className="text-xs text-neutral-400">limited</span> : null}
      {banned ? <span className="text-xs text-neutral-400">banned</span> : null}
    </div>
  );
}
