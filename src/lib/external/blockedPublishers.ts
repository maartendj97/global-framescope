// These outlets are under EU sanctions: distributing their content in
// the EU is suspended. RT and Sputnik since March 2022; RIA Novosti,
// Izvestia, Rossiyskaya Gazeta and Voice of Europe were added by the
// EU's 14th sanctions package, effective 25 June 2024. This app runs
// from and is used in the EU (Netherlands), so articles from these
// outlets are filtered out of every place we pull news in. TASS is
// explicitly NOT on the EU list and is used as the direct Russian
// state-outlet feed instead (see stateFeeds.ts). This is a safety
// filter, not legal advice.
//
// The patterns match whole words, so "RT News" and "Sputnik France" are
// blocked, but names that merely contain the letters (like "Artnet")
// are not.
const BLOCKED_PATTERNS = [
  /\bsputnik\b/i,
  /\brt\b/i,
  /\brussia today\b/i,
  /\bria novosti\b/i,
  /\bizvestia\b/i,
  /\brossiyskaya gazeta\b/i,
  /\bvoice of europe\b/i,
];

export function isSanctionedPublisher(publisherName: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(publisherName));
}
