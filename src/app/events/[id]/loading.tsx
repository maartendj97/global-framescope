// Skeleton for the event detail page while the event record loads (a
// cold cache or an older shared link can require a Redis lookup and, in
// the worst case, a pool refresh). Mirrors EventDetailView's layout:
// back row, hero image, meta line, title, tab pills.
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-md animate-pulse px-4 pt-6 pb-10 md:max-w-[960px]"
      aria-busy="true"
      aria-label="Loading event"
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 rounded bg-surface-secondary" />
        <div className="h-5 w-16 rounded bg-surface-secondary" />
      </div>
      <div className="mt-4 aspect-video w-full rounded-2xl bg-surface-secondary" />
      <div className="mt-4 h-3 w-32 rounded bg-surface-secondary" />
      <div className="mt-3 space-y-2">
        <div className="h-6 w-full rounded bg-surface-secondary" />
        <div className="h-6 w-3/4 rounded bg-surface-secondary" />
      </div>
      <div className="mt-5 h-13 rounded-full border border-border bg-surface-secondary" />
      <div className="mt-5 space-y-3">
        <div className="h-3 w-24 rounded bg-surface-secondary" />
        <div className="h-4 w-full rounded bg-surface-secondary" />
        <div className="h-4 w-11/12 rounded bg-surface-secondary" />
        <div className="h-4 w-2/3 rounded bg-surface-secondary" />
      </div>
    </div>
  );
}
