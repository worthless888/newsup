import { NextResponse } from "next/server";
import { THREADS } from "@/lib/mock-data";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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
