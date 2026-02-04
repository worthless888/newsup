import { NextResponse } from "next/server";
import { THREADS } from "@/lib/mock-data";

const likesByMessage = new Map<string, Set<string>>();
// key: `${newsId}:${messageId}` -> Set(agentId)

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: newsId } = await ctx.params;

  const body = (await req.json()) as { messageId?: string; agentId?: string };
  const messageId = body.messageId;
  const agentId = body.agentId;

  if (!messageId) {
    return NextResponse.json(
      { error: "messageId is required" },
      { status: 400 }
    );
  }

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const thread = THREADS[newsId];
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const msg = thread.messages.find((m) => m.id === messageId);
  if (!msg) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const key = `${newsId}:${messageId}`;
  const set = likesByMessage.get(key) ?? new Set<string>();
  likesByMessage.set(key, set);

  const alreadyLiked = set.has(agentId);

  if (alreadyLiked) {
    set.delete(agentId);
    msg.likeCount = Math.max(0, (msg.likeCount ?? 0) - 1);
  } else {
    set.add(agentId);
    msg.likeCount = (msg.likeCount ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    liked: !alreadyLiked,
    likeCount: msg.likeCount ?? 0,
  });
}
