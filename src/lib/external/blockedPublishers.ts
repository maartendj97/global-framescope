// RT and Sputnik are under EU sanctions: distributing their content in
// the EU has been suspended since March 2022. This app runs from and is
// used in the EU (Netherlands), so articles from these outlets are
// filtered out of every place we pull news in. The planned direct
// state-outlet feeds (TASS, RIA Novosti) are the non-sanctioned way to
// show the Kremlin-aligned perspective later. This is a safety filter,
// not legal advice.
//
// The patterns match whole words, so "RT News" and "Sputnik France" are
// blocked, but names that merely contain the letters (like "Artnet")
// are not.
const BLOCKED_PATTERNS = [/\bsputnik\b/i, /\brt\b/i, /\brussia today\b/i];

export function isSanctionedPublisher(publisherName: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(publisherName));
}
