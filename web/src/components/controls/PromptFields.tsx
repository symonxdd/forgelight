import { ArrowDownLeft, ChevronRight, X } from "lucide-react";
import { Collapsible, Tooltip } from "radix-ui";
import { useState } from "react";
import { HELP } from "../../lib/help";
import { looksLikeGenerationData } from "../../lib/infotext";
import { applyGenerationData, applySettingsFromPromptOrImage } from "../../stores/applySettings";
import { useSettings } from "../../stores/settings";
import { InfoTip } from "../InfoTip";

const textarea =
  "w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px] leading-relaxed text-fg-strong placeholder:text-faint hover:border-line-strong focus:border-line-strong focus:outline-none [field-sizing:content]";

function ApplySettingsButton() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={() => void applySettingsFromPromptOrImage()}
          aria-label="Apply settings from pasted data or the shown image"
          className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[12px] text-muted hover:bg-raised hover:text-fg-strong"
        >
          <ArrowDownLeft className="size-3.5" aria-hidden />
          Apply settings
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-72 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-fg shadow-lg shadow-black/15"
        >
          {HELP.applySettings}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Offered right after generation data is pasted into the prompt. */
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
        className="h-7 rounded-md bg-fg-strong px-2.5 text-[12px] font-medium text-canvas hover:bg-fg-strong/90"
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
  const [pastedData, setPastedData] = useState(false);

  return (
    <div className="flex flex-col gap-3 px-5 pt-4 pb-4">
      <div className="flex items-center gap-1.5">
        <label htmlFor="prompt" className="text-[13px] font-medium text-fg-strong">
          Prompt
        </label>
        <InfoTip topic="the prompt" text={HELP.prompt} />
        <span className="ml-auto">
          <ApplySettingsButton />
        </span>
      </div>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        onPaste={(e) => setPastedData(looksLikeGenerationData(e.clipboardData.getData("text")))}
        placeholder="Describe the image…"
        spellCheck={false}
        className={`${textarea} -mt-1 max-h-[40vh] min-h-32`}
      />
      {pastedData && looksLikeGenerationData(prompt) && <PastedDataBanner onDone={() => setPastedData(false)} />}

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
