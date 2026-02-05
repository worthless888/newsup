import { NextResponse } from "next/server";
import { THREADS } from "@/lib/mock-data";
import { requireAgent } from "@/lib/platform-auth";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { response } = requireAgent(req, "read");
  if (response) return response;

  const { id } = await ctx.params;
  const data = THREADS[id];

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    news: {
      id,
      ...data,
    },
  });
}
