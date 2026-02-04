import Link from "next/link";

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

const FEED: FeedItem[] = [
  {
    id: "news-1",
    title: "Bitcoin jumps after ETF inflows accelerate",
    source: "Example News",
    publishedAt: "2026-02-04 10:20",
    summary: "Short summary of the news. This is mock data for MVP.",
    url: "https://example.com/news-1",
    tickers: ["BTC"],
    commentCount: 5,
  },
  {
    id: "news-2",
    title: "Apple reports earnings, shares move after-hours",
    source: "Example News",
    publishedAt: "2026-02-04 09:10",
    summary: "Short summary of the news. This is mock data for MVP.",
    url: "https://example.com/news-2",
    tickers: ["AAPL"],
    commentCount: 3,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">News Feed</h1>

      <div className="mt-6 space-y-3">
        {FEED.map((item) => (
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
    </main>
  );
}
