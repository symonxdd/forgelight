import { parseInfotext } from "./infotext";

// Words that mark a prompt as adult. Only the prompt is checked: negative prompts
// often list "nsfw" precisely to avoid it.
const WORDS = [
  "nsfw",
  "rating_explicit",
  "rating_questionable",
  "explicit",
  "nude",
  "nudity",
  "naked",
  "topless",
  "bottomless",
  "uncensored",
  "sex",
  "sexual",
  "hetero",
  "penis",
  "pussy",
  "vagina",
  "vulva",
  "genitals",
  "nipples",
  "areola",
  "areolae",
  "cum",
  "cumshot",
  "ejaculation",
  "fellatio",
  "blowjob",
  "handjob",
  "paizuri",
  "anal",
  "penetration",
  "masturbation",
  "orgasm",
  "erection",
  "testicles",
  "futanari",
  "ahegao",
  "bdsm",
  "bondage",
  "porn",
  "hentai",
];

// Whole words only, allowing booru-style underscores and weights: "(nude:1.2)".
const PATTERN = new RegExp(`(?<![a-z])(${WORDS.join("|")})(?![a-z])`, "i");

/** A guess from the prompt's words; images without such words may still be adult. */
export function looksNsfw(infotext: string): boolean {
  return PATTERN.test(parseInfotext(infotext).prompt);
}
