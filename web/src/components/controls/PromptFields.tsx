import { ArrowDownToLine, ArrowUpToLine, ChevronRight, Eraser, PencilLine, X } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useState } from "react";
import { HELP } from "../../lib/help";
import { looksLikeGenerationData } from "../../lib/infotext";
import { applyGenerationData } from "../../stores/applySettings";
import { usePreferences } from "../../stores/preferences";
import { useSession } from "../../stores/session";
import { useSettings } from "../../stores/settings";
import { Hint } from "../Hint";
import { InfoTip } from "../InfoTip";
import { GenerateBar } from "./GenerateBar";
import { LoraChips } from "./LoraChips";
import { Messages } from "./Messages";

const textarea =
  "w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2.5 text-[14px] leading-relaxed text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:outline-none [field-sizing:content]";

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

/** Empties one prompt field, with an Undo in the message that follows. */
function ClearButton({ field, label }: { field: "prompt" | "negativePrompt"; label: string }) {
  const value = useSettings((s) => s[field]);
  if (!value) return null;
  const clear = () => {
    const previous = useSettings.getState()[field];
    useSettings.getState().update({ [field]: "" });
    useSession.getState().setNotice({
      tone: "info",
      text: `${label} cleared.`,
      action: { label: "Undo", run: () => useSettings.getState().update({ [field]: previous }) },
    });
    document.getElementById(field === "prompt" ? "prompt" : "negative-prompt")?.focus();
  };
  return (
    <Hint label={`Clear ${label.toLowerCase()}`}>
      <button
        type="button"
        onClick={clear}
        aria-label={`Clear ${label.toLowerCase()}`}
        className="grid size-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
      >
        <Eraser className="size-3.5" aria-hidden />
      </button>
    </Hint>
  );
}

/** Moves the prompt card to the other side of the image; the choice is remembered. */
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
 * The composer: prompt, LoRAs, negative prompt and Generate in one card, framed in the
 * accent color as the screen's main section. It sits under or above the image.
 */
export function PromptFields({ connected }: { connected: boolean }) {
  const prompt = useSettings((s) => s.prompt);
  const negativePrompt = useSettings((s) => s.negativePrompt);
  const negativeOpen = useSettings((s) => s.negativeOpen);
  const update = useSettings((s) => s.update);
  const setNegativeOpen = useSettings((s) => s.setNegativeOpen);
  const showLoras = useSettings((s) => !s.hiddenSections.includes("loras"));
  // Dismissing hides the offer until the prompt text changes.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const offerApply = looksLikeGenerationData(prompt) && dismissedFor !== prompt;

  return (
    <section
      aria-label="Prompt"
      className="flex flex-col gap-3 rounded-xl border border-accent/45 bg-surface p-4 shadow-[0_0_0_0_transparent] focus-within:border-accent/80 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)] motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200"
    >
      <div className="flex h-6 items-center gap-1.5">
        <PencilLine className="size-4 shrink-0 text-accent" aria-hidden />
        <label htmlFor="prompt" className="text-[13px] font-medium text-fg-strong">
          Prompt
        </label>
        <InfoTip topic="the prompt" text={HELP.prompt} />
        <div className="ml-auto flex items-center gap-0.5">
          <ClearButton field="prompt" label="Prompt" />
          <SwapPositionButton />
        </div>
      </div>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        placeholder="Describe the image…"
        spellCheck={false}
        className={`${textarea} -mt-1 max-h-[30vh] min-h-18`}
      />
      {offerApply && <PastedDataBanner onDone={() => setDismissedFor(prompt)} />}
      {showLoras && <LoraChips />}

      <Collapsible.Root open={negativeOpen || negativePrompt.length > 0} onOpenChange={setNegativeOpen}>
        <div className="flex h-6 items-center gap-1.5">
          <Collapsible.Trigger
            disabled={negativePrompt.length > 0}
            className="group flex items-center gap-1.5 text-[13px] text-muted hover:text-fg disabled:cursor-default disabled:text-fg-strong"
          >
            <ChevronRight
              className="size-3.5 group-data-[state=open]:rotate-90 motion-safe:transition-transform motion-safe:duration-200"
              aria-hidden
            />
            Negative prompt
          </Collapsible.Trigger>
          <InfoTip topic="the negative prompt" text={HELP.negativePrompt} />
          <div className="ml-auto flex items-center">
            <ClearButton field="negativePrompt" label="Negative prompt" />
          </div>
        </div>
        <Collapsible.Content className="collapsible overflow-hidden">
          <div className="pt-2">
            <label htmlFor="negative-prompt" className="sr-only">
              Negative prompt
            </label>
            <textarea
              id="negative-prompt"
              value={negativePrompt}
              onChange={(e) => update({ negativePrompt: e.target.value })}
              placeholder="What to avoid…"
              spellCheck={false}
              className={`${textarea} max-h-[30vh] min-h-20`}
            />
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
      <GenerateBar connected={connected} />
      <Messages />
    </section>
  );
}
