import { HELP } from "../../lib/help";
import { LIBRARY_BLUR_CHOICES, LIBRARY_RATINGS, parseLibraryBlur } from "../../lib/preferences";
import { usePreferences } from "../../stores/preferences";
import { InfoTip } from "../InfoTip";
import { SelectMenu } from "../SelectMenu";

/**
 * Which images the Library shows (All, SFW, NSFW) and how their previews show (blurred or
 * not). Both rely on the same guess from each prompt's words, explained in one info tip.
 */
export function ContentFilter() {
  const rating = usePreferences((s) => s.libraryRating);
  const setRating = usePreferences((s) => s.setLibraryRating);
  const blur = usePreferences((s) => s.libraryBlur);
  const setBlur = usePreferences((s) => s.setLibraryBlur);

  return (
    <div className="flex items-center gap-2">
      <div role="radiogroup" aria-label="Show" className="flex h-8 items-center rounded-md border border-line p-0.5">
        {LIBRARY_RATINGS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={rating === id}
            onClick={() => setRating(id)}
            className={`h-full rounded-[5px] px-2.5 text-[12.5px] ${
              rating === id ? "bg-raised font-medium text-fg-strong" : "text-muted hover:text-fg-strong"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <SelectMenu
        value={blur}
        options={LIBRARY_BLUR_CHOICES.map(({ id, label }) => ({ value: id, label }))}
        onChange={(v) => setBlur(parseLibraryBlur(v))}
        aria-label="Blur previews"
        className="h-8 w-32 rounded-md border border-line bg-surface px-2.5 text-[13px] text-fg-strong hover:border-line-strong"
      />
      <InfoTip topic="the content filter" text={HELP.libraryContent} side="bottom" />
    </div>
  );
}
