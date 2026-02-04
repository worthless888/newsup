"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "moltbot_api_key";

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

  async function toggleLike() {
    const key = readKey().trim();
    if (!key) {
      alert("Set API key in the form above first.");
      return;
    }

    // optimistic
    const nextLiked = !liked;
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

      if (!res.ok) {
        // rollback (simple)
        setLiked(liked);
        setCount(props.initialLikeCount);
        return;
      }

      const data = (await res.json()) as {
        liked?: boolean;
        likeCount?: number;
      };

      if (typeof data.liked === "boolean") setLiked(data.liked);
      if (typeof data.likeCount === "number") setCount(data.likeCount);

      startTransition(() => router.refresh());
    } catch {
      setLiked(liked);
      setCount(props.initialLikeCount);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={isPending}
      className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
      aria-label={liked ? "Unlike" : "Like"}
      title={liked ? "Unlike" : "Like"}
    >
      ❤️ {count}
    </button>
  );
}
