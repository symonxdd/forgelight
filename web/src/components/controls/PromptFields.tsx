import { ChevronRight, X } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useState } from "react";
import { HELP } from "../../lib/help";
import { looksLikeGenerationData } from "../../lib/infotext";
import { applyGenerationData } from "../../stores/applySettings";
import { useSettings } from "../../stores/settings";
import { InfoTip } from "../InfoTip";

const textarea =
  "w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px] leading-relaxed text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:outline-none [field-sizing:content]";

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

export function PromptFields() {
  const prompt = useSettings((s) => s.prompt);
  const negativePrompt = useSettings((s) => s.negativePrompt);
  const negativeOpen = useSettings((s) => s.negativeOpen);
  const update = useSettings((s) => s.update);
  const setNegativeOpen = useSettings((s) => s.setNegativeOpen);
  // Dismissing hides the offer until the prompt text changes.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const offerApply = looksLikeGenerationData(prompt) && dismissedFor !== prompt;

  return (
    <div className="flex flex-col gap-3 px-5 pt-4 pb-4">
      <div className="flex items-center gap-1.5">
        <label htmlFor="prompt" className="text-[13px] font-medium text-fg-strong">
          Prompt
        </label>
        <InfoTip topic="the prompt" text={HELP.prompt} />
      </div>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        placeholder="Describe the image…"
        spellCheck={false}
        className={`${textarea} -mt-1 max-h-[40vh] min-h-32`}
      />
      {offerApply && <PastedDataBanner onDone={() => setDismissedFor(prompt)} />}

      <Collapsible.Root open={negativeOpen || negativePrompt.length > 0} onOpenChange={setNegativeOpen}>
        <div className="flex items-center gap-1.5">
          <Collapsible.Trigger
            disabled={negativePrompt.length > 0}
            className="group flex items-center gap-1.5 text-[13px] text-muted hover:text-fg disabled:cursor-default disabled:text-fg-strong"
          >
            <ChevronRight
              className="size-3.5 group-data-[state=open]:rotate-90 motion-safe:transition-transform"
              aria-hidden
            />
            Negative prompt
          </Collapsible.Trigger>
          <InfoTip topic="the negative prompt" text={HELP.negativePrompt} />
        </div>
        <Collapsible.Content className="pt-2">
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
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}
