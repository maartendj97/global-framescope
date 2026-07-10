import type { CountryCode, Event } from "@/types";

/**
 * Illustrative mock content for Phase 1. These events, and all associated
 * framing/source/key-difference fixtures, are fictional and do not represent
 * real reporting, real quotations, or real editorial positions.
 */

const ALL_COUNTRIES: CountryCode[] = ["NL", "US", "RU", "CN", "IN", "IR", "UA"];

export const events: Event[] = [
  {
    id: "ru-ua-ceasefire-talks",
    title: "Russia–Ukraine Peace and Ceasefire Negotiations",
    category: "conflict",
    date: "2026-05-12",
    summary:
      "Delegations from Russia and Ukraine held a new round of talks aimed at a negotiated ceasefire, with international mediators present.",
    context:
      "The talks are the latest in a series of negotiation attempts since the outbreak of the conflict, following earlier rounds that failed to produce a lasting agreement. International observers, including the Netherlands, the United States, China, and India, have offered mediation or expressed positions on the terms under discussion.",
    availableCountries: ALL_COUNTRIES,
  },
  {
    id: "global-climate-emissions-agreement",
    title: "Global Climate Summit Reaches Emissions Agreement",
    category: "climate",
    date: "2026-04-03",
    summary:
      "Delegates at an international climate summit agreed on a new framework for reducing greenhouse gas emissions over the next decade.",
    context:
      "The agreement follows years of negotiation over how to divide emissions-reduction responsibility between industrialized and developing economies. Major emitters and climate-vulnerable nations alike sent delegations, and reactions to the agreement's fairness and ambition varied widely by country.",
    availableCountries: ALL_COUNTRIES,
  },
  {
    id: "iran-nuclear-negotiations",
    title: "Iran Nuclear Program Negotiations Resume",
    category: "diplomacy",
    date: "2026-06-20",
    summary:
      "Talks over Iran's nuclear program resumed between Iranian negotiators and a group of international counterparts after a period of stalled diplomacy.",
    context:
      "The negotiations concern the scope of Iran's nuclear program and the potential easing of international sanctions. The talks involve multiple stakeholders with differing strategic interests in the outcome, from regional security to global energy markets.",
    availableCountries: ALL_COUNTRIES,
  },
];
