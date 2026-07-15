"use client";

import { useEffect } from "react";
import Link from "next/link";

// Root error boundary — the branded fallback for any unexpected runtime
// error below the root layout. The pipeline itself fails soft to empty
// lists, so landing here should be rare.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center px-4 text-center md:max-w-[960px]">
      <p className="text-sm font-medium tracking-wide text-accent-text">
        Global FrameScope
      </p>
      <h1 className="mt-3 font-serif text-3xl leading-tight text-foreground">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        An unexpected error interrupted this page. It may be temporary —
        trying again usually resolves it.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="flex min-h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-inverse-foreground"
        >
          Try again
        </button>
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
