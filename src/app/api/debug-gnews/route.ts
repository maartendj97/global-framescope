import { NextResponse } from "next/server";
import { fetchLiveEvents } from "@/lib/external/gnews";

// Temporary diagnostic route. Remove once the live event feed is
// confirmed working.
export async function GET() {
  const keyPresent = Boolean(process.env.GNEWS_API_KEY);
  const events = await fetchLiveEvents();
  return NextResponse.json({ keyPresent, eventCount: events.length, events });
}
