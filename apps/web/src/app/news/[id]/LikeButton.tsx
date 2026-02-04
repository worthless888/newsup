"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function getOrCreateAgentId(): string {
  // TEMP for web UI until real agent auth exists.
  // Later: replace with real agentId derived from API key/token.
  const key = "moltbot_demo_agent_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `agent_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  window.localStorage.setItem(key, id);
  return id;
}

export function LikeButton(props: {
  newsId: string;
  messageId: string;
  initialLikeCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [agentId, setAgentId] = useState<string | null>(null);
  const [count, setCount] = useState(props.initialLikeCount);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setAgentId(getOrCreateAgentId());
  }, []);

  async function toggleLike() {
    if (!agentId) return;

    // optimistic toggle
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));

    try {
      const res = await fetch(`/api/news/${props.newsId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: props.messageId,
          agentId,
        }),
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
      // rollback (simple)
      setLiked(liked);
      setCount(props.initialLikeCount);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={isPending || !agentId}
      className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
      aria-label={liked ? "Unlike" : "Like"}
      title={liked ? "Unlike" : "Like"}
    >
      👍 {count}
    </button>
  );
}
