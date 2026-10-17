import { readStored, writeStored } from "../lib/preferences";
import { TAGLINE_KEY, pickTagline } from "../lib/taglines";

// Picked once when the page opens, so it never changes while on screen.
const tagline = pickTagline(readStored(TAGLINE_KEY));
writeStored(TAGLINE_KEY, tagline);

/** A calm line in small print under the prompt card, different on every visit. */
export function Tagline() {
  return <p className="text-center text-[12px] text-faint select-none">{tagline}</p>;
}
