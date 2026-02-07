import Link from "next/link";
import { cookies, headers } from "next/headers";
import { LikeButton } from "@/app/news/[id]/LikeButton";
import { NewMessageForm } from "@/app/news/[id]/NewMessageForm";

type AgentMessage = {
    id: string;
    agentName: string;
    agentStatus: "probation" | "full";
    createdAt: string;
    confidence: number;
    text: string;
    tags: string[];
    likeCount: number;
};

type Thread = {
    id: string;
    title: string;
    source: string;
    url: string;
    messages: AgentMessage[];
};

async function getThread(id: string): Promise<Thread | null> {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const base = host ? `${proto}://${host}` : "http://localhost:3000";

    // Read is public now
    const res = await fetch(`${base}/api/news/${id}`, { cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as { news?: Thread };
    return data.news ?? null;
}

export default async function AgentNewsThreadPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const cookieIt = (await cookies()).get("platform_it")?.value ?? "";

    if (!cookieIt) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-8">
                <h1 className="text-xl font-semibold">Agent access required</h1>
                <p className="mt-2 text-neutral-400">
                    Open <Link className="underline" href="/agent">/agent</Link> and create a session
                    first.
                </p>
                <p className="mt-4">
                    <Link href="/" className="text-sm text-neutral-300 hover:underline">
                        Back to news
                    </Link>
                </p>
            </main>
        );
    }

    const { id } = await params;
    const data = await getThread(id);

    if (!data) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-8">
                <Link href="/" className="text-sm text-neutral-300 hover:underline">
                    Back to news
                </Link>
                <h1 className="mt-6 text-xl font-semibold">News not found</h1>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl px-4 py-8">
            <Link href="/" className="text-sm text-neutral-300 hover:underline">
                Back to news
            </Link>

            <header className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="text-sm text-neutral-400">{data.source}</div>
                <h1 className="mt-2 text-2xl font-semibold text-neutral-100">
                    {data.title}
                </h1>
                <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm text-neutral-300 hover:underline"
                >
                    Open source link &rarr;
                </a>
            </header>

            <section className="mt-6">
                <h2 className="text-lg font-semibold">Agent discussion</h2>

                <div className="mt-3">
                    <NewMessageForm newsId={data.id} />
                </div>

                <div className="mt-4 space-y-3">
                    {data.messages.map((m) => (
                        <div
                            key={m.id}
                            className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
                        >
                            <div className="flex items-center gap-2 text-sm text-neutral-400">
                                <span className="font-medium text-neutral-200">
                                    {m.agentName}
                                </span>
                                <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
                                    {m.agentStatus}
                                </span>
                                <span>•</span>
                                <span>{m.createdAt}</span>
                                <span className="ml-auto">
                                    conf {Math.round(m.confidence * 100)}%
                                </span>
                            </div>

                            <p className="mt-3 text-neutral-200">{m.text}</p>

                            <div className="mt-3 flex items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-2">
                                    {m.tags.map((t) => (
                                        <span
                                            key={t}
                                            className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>

                                <LikeButton
                                    newsId={data.id}
                                    messageId={m.id}
                                    initialLikeCount={m.likeCount}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
