import { ArrowDownToLine, ArrowUpToLine, X } from "lucide-react";
import { useState } from "react";
import { HELP } from "../../lib/help";
import { looksLikeGenerationData } from "../../lib/infotext";
import { applyGenerationData } from "../../stores/applySettings";
import { usePreferences } from "../../stores/preferences";
import { useSettings } from "../../stores/settings";
import { Hint } from "../Hint";
import { GenerateBar } from "./GenerateBar";
import { LoraChips } from "./LoraChips";
import { PromptCard } from "./PromptCard";
import { StartImageRow } from "./StartImage";

/** Offered whenever the prompt holds generation data, such as text copied from an image on Civitai. */
function PastedDataBanner({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2">
      <p className="flex-1 text-[12.5px] text-fg">Generation settings found in the prompt.</p>
      <button
        type="button"
        onClick={() => {
          onDone();
          void applyGenerationData(useSettings.getState().prompt);
        }}
        className="h-7 rounded-md bg-primary px-2.5 text-[12px] font-medium text-on-primary hover:bg-primary-hover"
      >
        Apply all
      </button>
      <button
        type="button"
        onClick={onDone}
        aria-label="Dismiss"
        className="grid size-6 place-items-center rounded text-muted hover:text-fg-strong"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** Moves the prompt cards to the other side of the image; the choice is remembered. */
function SwapPositionButton() {
  const position = usePreferences((s) => s.promptPosition);
  const setPosition = usePreferences((s) => s.setPromptPosition);
  const label = position === "below" ? "Move the prompt above the image" : "Move the prompt below the image";
  const Icon = position === "below" ? ArrowUpToLine : ArrowDownToLine;
  return (
    <Hint label={label}>
      <button
        type="button"
        onClick={() => setPosition(position === "below" ? "above" : "below")}
        aria-label={label}
        className="grid size-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
      >
        <Icon className="size-3.5" aria-hidden />
      </button>
    </Hint>
  );
}

/**
 * The composer, under or above the image: the prompt and the negative prompt as two cards
 * side by side, and a card with the starting image, LoRAs and Generate. The prompt cards
 * border the image, so a card opening for long text glides out over it.
 */
export function PromptFields({ connected }: { connected: boolean }) {
  const prompt = useSettings((s) => s.prompt);
  const showLoras = useSettings((s) => !s.hiddenSections.includes("loras"));
  const above = usePreferences((s) => s.promptPosition) === "above";
  // Dismissing hides the offer until the prompt text changes.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const offerApply = looksLikeGenerationData(prompt) && dismissedFor !== prompt;

  // The prompt wider, as it usually runs longer; a narrow composer stacks them. Each keeps to
  // the edge away from the image, so only the open card moves.
  const prompts = (
    <div className={`grid gap-2.5 @xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${above ? "items-start" : "items-end"}`}>
      <PromptCard
        id="prompt"
        field="prompt"
        label="Prompt"
        placeholder="Describe the image…"
        help={HELP.prompt}
        helpTopic="the prompt"
      >
        {offerApply && <PastedDataBanner onDone={() => setDismissedFor(prompt)} />}
      </PromptCard>
      <PromptCard
        id="negative-prompt"
        field="negativePrompt"
        label="Negative prompt"
        placeholder="What to avoid…"
        help={HELP.negativePrompt}
        helpTopic="the negative prompt"
        actions={<SwapPositionButton />}
      />
    </div>
  );
  const actions = (
    <section aria-label="Generate" className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <StartImageRow />
      {showLoras && <LoraChips />}
      <GenerateBar connected={connected} />
    </section>
  );

  return (
    <div className="@container flex flex-col gap-2.5">
      {above ? actions : prompts}
      {above ? prompts : actions}
    </div>
  );
}
