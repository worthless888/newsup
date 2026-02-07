import { NextResponse } from "next/server";
import { FEED } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ feed: FEED });
}