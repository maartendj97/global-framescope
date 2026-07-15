import Link from "next/link";

// Branded 404 — reached via notFound() on /events/[id] (an expired or
// mistyped event link) or any unmatched URL. Live events rotate out of
// the pool, so a dead event link is the expected case; point people at
// what's current instead of a dead end.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center px-4 text-center md:max-w-[960px]">
      <p className="text-sm font-medium tracking-wide text-accent-text">
        Global FrameScope
      </p>
      <h1 className="mt-3 font-serif text-3xl leading-tight text-foreground">
        Page not found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        This link may point to an event that has rotated out of the current
        pool, or the address may be mistyped.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/events"
          className="flex min-h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-inverse-foreground"
        >
          Browse current events
        </Link>
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-full border border-border bg-surface px-5 text-sm font-medium text-foreground"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
