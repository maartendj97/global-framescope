import Image from "next/image";
import Link from "next/link";
import type { Country, Event } from "@/types";
import { BookmarkButton } from "./BookmarkButton";
import { ChevronRightIcon } from "./icons";
import {
  CATEGORY_LABELS,
  formatEventDate,
  getEventImageSrc,
  isExternalEventImage,
} from "@/lib/eventDisplay";

type EventCardProps = {
  event: Event;
  countries: Country[];
  sourceCount: number;
  variant?: "featured" | "secondary" | "compact" | "list";
};

export function EventCard({
  event,
  countries,
  sourceCount,
  variant = "compact",
}: EventCardProps) {
  const isFeatured = variant === "featured";
  const isSecondary = variant === "secondary";
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

  if (isFeatured || isSecondary) {
    return (
      <Link
        href={`/events/${event.id}`}
        className="block rounded-3xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
          <Image
            src={getEventImageSrc(event)}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 768px) 600px, 100vw"
            unoptimized={isExternalEventImage(event)}
            priority={isFeatured}
          />
          <BookmarkButton
            eventId={event.id}
            className="absolute right-2 top-2"
          />
        </div>
        <div className="mt-4 space-y-2 px-1 pb-1">
          {meta}
          <h2
            className={`font-serif leading-snug text-foreground ${
              isFeatured ? "text-xl" : "text-lg"
            }`}
          >
            {event.title}
          </h2>
          <p className={`text-muted-foreground ${isFeatured ? "text-sm" : "text-xs"}`}>
            {event.summary}
          </p>
          {flagsAndSources}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.id}`}
      className={`flex gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md ${
        isList ? "items-stretch" : "items-center"
      }`}
    >
      <div
        className={`relative w-24 shrink-0 overflow-hidden rounded-xl ${
          isList ? "self-stretch" : "h-24"
        }`}
      >
        <Image
          src={getEventImageSrc(event)}
          alt=""
          fill
          className="object-cover"
          sizes="96px"
          unoptimized={isExternalEventImage(event)}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {meta}
        <h3
          className={`font-serif text-base leading-snug text-foreground ${
            isList ? "" : "line-clamp-2"
          }`}
        >
          {event.title}
        </h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{event.summary}</p>
        {!isList && flagsAndSources}
      </div>
      {!isList && (
        <div className="flex shrink-0 items-center gap-1">
          <BookmarkButton eventId={event.id} variant="plain" />
          <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </Link>
  );
}
