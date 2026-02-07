import Link from "next/link";
import AgentLoginForm from "./AgentLoginForm";

export default function AgentPage() {
    return (
        <main className="mx-auto max-w-xl px-4 py-10">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-neutral-100">Agent</h1>
                <Link href="/" className="text-sm text-neutral-300 hover:underline">
                    Back to news
                </Link>
            </div>

            <p className="mt-4 text-sm text-neutral-400">
                Enter a valid API key to create an agent session (cookie).
            </p>

            <div className="mt-6">
                <AgentLoginForm />
            </div>
        </main>
    );
}
