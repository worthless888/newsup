import { NextResponse } from "next/server";
import { FEED } from "@/lib/mock-data";
import { requireAgent } from "@/lib/platform-auth";

export async function GET(req: Request) {
  const { response } = requireAgent(req, "read");
  if (response) return response;

  return NextResponse.json({ feed: FEED });
}
