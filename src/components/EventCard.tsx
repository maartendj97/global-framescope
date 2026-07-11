import Image from "next/image";
import Link from "next/link";
import type { Country, Event } from "@/types";
import { ChevronRightIcon } from "./icons";
import { CATEGORY_LABELS, CATEGORY_IMAGES, formatEventDate } from "@/lib/eventDisplay";

type EventCardProps = {
  event: Event;
  countries: Country[];
  sourceCount: number;
  variant?: "featured" | "compact" | "list";
};

export function EventCard({
  event,
  countries,
  sourceCount,
  variant = "compact",
}: EventCardProps) {
  const isFeatured = variant === "featured";
  const isList = variant === "list";
  const eventCountries = countries.filter((country) =>
    event.availableCountries.includes(country.code)
  );

  const meta = (
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span>{CATEGORY_LABELS[event.category]}</span>
      <span aria-hidden="true">·</span>
      <span>{formatEventDate(event.date)}</span>
    </div>
  );

  const flagsAndSources = (
    <div className="flex items-center justify-between">
      <div className="flex gap-1 text-sm" aria-label="Countries covered">
        {eventCountries.map((country) => (
          <span key={country.code} title={country.name}>
            {country.flagEmoji}
          </span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {sourceCount} {sourceCount === 1 ? "source" : "sources"}
      </span>
    </div>
  );

  if (isFeatured) {
    return (
      <Link
        href={`/events/${event.id}`}
        className="block rounded-3xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
          <Image
            src={CATEGORY_IMAGES[event.category]}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 768px) 600px, 100vw"
            priority
          />
        </div>
        <div className="mt-4 space-y-2 px-1 pb-1">
          {meta}
          <h2 className="font-serif text-xl leading-snug text-foreground">
            {event.title}
          </h2>
          <p className="text-sm text-muted-foreground">{event.summary}</p>
          {flagsAndSources}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={CATEGORY_IMAGES[event.category]}
          alt=""
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {meta}
        <h3 className="font-serif text-base leading-snug text-foreground">
          {event.title}
        </h3>
        <p
          className={
            isList
              ? "text-xs text-muted-foreground"
              : "line-clamp-1 text-xs text-muted-foreground"
          }
        >
          {event.summary}
        </p>
        {!isList && flagsAndSources}
      </div>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
