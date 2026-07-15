// Skeleton for the Home tab while the events pool loads (the pool can
// take several seconds on a cold cache, since it may hit external news
// APIs). Mirrors Home's layout: intro block, featured card, one
// secondary card peeking below the fold.
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-md animate-pulse px-4 pt-8 md:max-w-[960px]"
      aria-busy="true"
      aria-label="Loading events"
    >
      <div className="h-4 w-36 rounded bg-surface-secondary" />
      <div className="mt-3 space-y-2">
        <div className="h-8 w-full rounded bg-surface-secondary" />
        <div className="h-8 w-3/5 rounded bg-surface-secondary" />
      </div>
      <div className="mt-3 h-4 w-4/5 rounded bg-surface-secondary" />

      <div className="mt-8 h-4 w-44 rounded bg-surface-secondary" />
      <div className="mt-3 rounded-3xl border border-border bg-surface p-3 shadow-sm">
        <div className="aspect-video w-full rounded-2xl bg-surface-secondary" />
        <div className="mt-4 space-y-2 px-1 pb-1">
          <div className="h-3 w-28 rounded bg-surface-secondary" />
          <div className="h-5 w-11/12 rounded bg-surface-secondary" />
          <div className="h-4 w-full rounded bg-surface-secondary" />
        </div>
      </div>

      <div className="mt-8 h-4 w-32 rounded bg-surface-secondary" />
      <div className="mt-3 rounded-3xl border border-border bg-surface p-3 shadow-sm">
        <div className="aspect-video w-full rounded-2xl bg-surface-secondary" />
        <div className="mt-4 space-y-2 px-1 pb-1">
          <div className="h-3 w-28 rounded bg-surface-secondary" />
          <div className="h-5 w-10/12 rounded bg-surface-secondary" />
        </div>
      </div>
    </div>
  );
}
