import type { EventCategory } from "@/types";
import { CATEGORY_LABELS, formatEventDate } from "@/lib/eventDisplay";

type EventMetaProps = {
  category: EventCategory;
  date: string;
};

export function EventMeta({ category, date }: EventMetaProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span>{CATEGORY_LABELS[category]}</span>
      <span aria-hidden="true">·</span>
      <span>{formatEventDate(date)}</span>
    </div>
  );
}
