"use client";

import { useState } from "react";
import { ALL_CATEGORIES } from "@/types";
import type { Country, Event, EventCategory } from "@/types";
import { EventCard } from "./EventCard";
import { StaggerItem } from "./StaggerItem";
import { CATEGORY_LABELS, getEventSourceCount } from "@/lib/eventDisplay";
import { useBookmarkedIds } from "@/lib/bookmarks";
import { BookmarkIcon, SearchIcon } from "./icons";

type EventsListProps = {
  events: Event[];
  countries: Country[];
  sourceCountByEventId: Map<string, number>;
};

export function EventsList({ events, countries, sourceCountByEventId }: EventsListProps) {
  const [activeCategory, setActiveCategory] = useState<EventCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const bookmarkedIds = useBookmarkedIds();

  const query = searchQuery.trim().toLowerCase();

  const filteredEvents = events.filter((event) => {
    if (activeCategory !== "all" && event.category !== activeCategory) return false;
    if (showBookmarkedOnly && !bookmarkedIds.includes(event.id)) return false;
    if (
      query &&
      !event.title.toLowerCase().includes(query) &&
      !event.summary.toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });

  return (
    <>
      <label className="relative mt-4 block">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search events"
          aria-label="Search events by title or summary"
          className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </label>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        <FilterChip
          label="All"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
        {ALL_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            label={CATEGORY_LABELS[category]}
            active={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          />
        ))}
        <FilterChip
          label="Saved"
          icon={<BookmarkIcon filled={showBookmarkedOnly} className="h-3.5 w-3.5" />}
          active={showBookmarkedOnly}
          onClick={() => setShowBookmarkedOnly((current) => !current)}
        />
      </div>

      <div className="mt-4 space-y-3">
        {filteredEvents.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No events match right now.
          </p>
        )}
        {filteredEvents.map((event, index) => (
          <StaggerItem key={event.id} index={index}>
            <EventCard
              event={event}
              countries={countries}
              sourceCount={getEventSourceCount(event, sourceCountByEventId)}
              variant="list"
            />
          </StaggerItem>
        ))}
      </div>
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-inverse-foreground"
          : "border-border bg-surface text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
