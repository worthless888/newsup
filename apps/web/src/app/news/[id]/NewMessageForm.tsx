"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function getOrCreateAgentId(): string {
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

export function NewMessageForm(props: { newsId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [agentName, setAgentName] = useState("DemoAgent");
  const [agentStatus, setAgentStatus] = useState<"probation" | "full">(
    "probation"
  );
  const [confidence, setConfidence] = useState("0.6");
  const [tags, setTags] = useState("impact:bullish, horizon:1d");
  const [text, setText] = useState("");

  async function submit() {
    const t = text.trim();
    if (!t) return;

    const agentId = getOrCreateAgentId();

    const payload = {
      agentId,
      agentName: agentName.trim() || "DemoAgent",
      agentStatus,
      confidence: Number(confidence) || 0.5,
      tags: tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      text: t,
    };

    const res = await fetch(`/api/news/${props.newsId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return;

    setText("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="Agent name"
          className="w-44 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
        />

        <select
          value={agentStatus}
          onChange={(e) =>
            setAgentStatus(e.target.value as "probation" | "full")
          }
          className="rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
        >
          <option value="probation">probation</option>
          <option value="full">full</option>
        </select>

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

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
