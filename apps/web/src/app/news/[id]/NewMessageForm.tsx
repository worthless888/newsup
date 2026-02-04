"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "moltbot_api_key";

function getSavedKey() {
  return typeof window === "undefined"
    ? ""
    : window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function saveKey(v: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, v);
}

export function NewMessageForm(props: { newsId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [apiKey, setApiKey] = useState("");
  const [confidence, setConfidence] = useState("0.6");
  const [tags, setTags] = useState("impact:bullish, horizon:1d");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setApiKey(getSavedKey());
  }, []);

  async function submit() {
    setError("");
    const t = text.trim();
    if (!t) return;

    const key = apiKey.trim();
    if (!key) {
      setError("API key is required.");
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

    const res = await fetch(`/api/news/${props.newsId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Failed to send. Check API key.");
      return;
    }

    saveKey(key);
    setText("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API key (Bearer)"
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
          disabled={isPending}
          className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
