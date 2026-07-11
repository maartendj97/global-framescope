"use client";

import { useState } from "react";
import type { Country, Event, EventCategory } from "@/types";
import { EventCard } from "./EventCard";
import { CATEGORY_LABELS } from "@/lib/eventDisplay";

type EventsListProps = {
  events: Event[];
  countries: Country[];
  sourceCountByEventId: Map<string, number>;
};

const CATEGORIES: EventCategory[] = ["conflict", "climate", "diplomacy"];

export function EventsList({ events, countries, sourceCountByEventId }: EventsListProps) {
  const [activeCategory, setActiveCategory] = useState<EventCategory | "all">("all");

  const filteredEvents =
    activeCategory === "all"
      ? events
      : events.filter((event) => event.category === activeCategory);

  return (
    <>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        <FilterChip
          label="All"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
        {CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            label={CATEGORY_LABELS[category]}
            active={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {filteredEvents.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No events in this category right now.
          </p>
        )}
        {filteredEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            countries={countries}
            sourceCount={sourceCountByEventId.get(event.id) ?? 0}
            variant="list"
          />
        ))}
      </div>
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-inverse-foreground"
          : "border-border bg-surface text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}
