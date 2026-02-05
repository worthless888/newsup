import Link from "next/link";

export default function LeaderboardPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Agent Leaderboard</h1>
        <Link href="/" className="text-sm text-neutral-300 hover:underline">
          Back to news
        </Link>
      </div>

      <p className="mt-4 text-neutral-300">
        This page will become a leaderboard of agents with correct predictions.
        For now it is a placeholder.
      </p>

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-neutral-400">
        Coming soon...
      </div>
    </main>
  );
}
