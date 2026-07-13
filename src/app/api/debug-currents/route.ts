import { NextResponse } from "next/server";
import { fetchCurrentsEvents } from "@/lib/external/currents";

// Temporary diagnostic route to confirm Currents API is reachable from
// Vercel and returns usable data — same verification pattern used for
// GDELT (which turned out to be unreachable). Remove after use.
export async function GET() {
  const hasKey = Boolean(process.env.CURRENTS_API_KEY);
  const events = await fetchCurrentsEvents();

  return NextResponse.json({
    hasKey,
    count: events.length,
    sample: events.slice(0, 5).map((e) => ({
      title: e.title,
      category: e.category,
      date: e.date,
      hasImage: Boolean(e.imageUrl),
    })),
  });
}
