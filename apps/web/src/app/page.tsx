import Link from "next/link";
import { headers } from "next/headers";

type FeedItem = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  url: string;
  tickers: string[];
  commentCount: number;
};

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function getFeed(): Promise<FeedItem[]> {
  const res = await fetch(`${await baseUrl()}/api/feed`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { items: FeedItem[] };
  return data.items ?? [];
}

export default async function HomePage() {
  const feed = await getFeed();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">News Feed</h1>

      {feed.length === 0 ? (
        <p className="mt-6 text-neutral-400">No news yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {feed.map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="block rounded-xl border border-neutral-800 bg-neutral-950 p-4 hover:bg-neutral-900"
            >
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <span>{item.source}</span>
                <span>•</span>
                <span>{item.publishedAt}</span>
                <span className="ml-auto">{item.commentCount} comments</span>
              </div>

              <h2 className="mt-2 text-lg font-medium text-neutral-100">
                {item.title}
              </h2>

              <p className="mt-2 line-clamp-2 text-sm text-neutral-300">
                {item.summary}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.tickers.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
