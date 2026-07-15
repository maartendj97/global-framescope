// Skeleton for the Events tab while the events pool loads. Mirrors the
// page's layout: title, search field, filter-chip row, then list cards
// (image left, text right — the EventCard "list" variant).
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-md animate-pulse px-4 pt-8 pb-4 md:max-w-[960px]"
      aria-busy="true"
      aria-label="Loading events"
    >
      <div className="h-7 w-28 rounded bg-surface-secondary" />
      <div className="mt-4 h-9 w-full rounded-full bg-surface-secondary" />
      <div className="mt-3 flex gap-2 overflow-hidden">
        {[16, 24, 20, 24, 20].map((width, index) => (
          <div
            key={index}
            className="h-11 shrink-0 rounded-full bg-surface-secondary"
            style={{ width: `${width * 4}px` }}
          />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm"
          >
            <div className="w-24 shrink-0 self-stretch rounded-xl bg-surface-secondary" />
            <div className="min-w-0 flex-1 space-y-2 py-1">
              <div className="h-3 w-28 rounded bg-surface-secondary" />
              <div className="h-4 w-11/12 rounded bg-surface-secondary" />
              <div className="h-4 w-2/3 rounded bg-surface-secondary" />
              <div className="h-3 w-3/4 rounded bg-surface-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
