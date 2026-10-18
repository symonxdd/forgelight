import { ArrowDownToLine, ArrowUpToLine, ChevronRight, Eraser, X } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useLayoutEffect, useRef, useState, type FocusEvent } from "react";
import { HELP } from "../../lib/help";
import { isRunning } from "../../stores/generation";
import { looksLikeGenerationData } from "../../lib/infotext";
import { applyGenerationData } from "../../stores/applySettings";
import { usePreferences } from "../../stores/preferences";
import { useSession } from "../../stores/session";
import { useSettings } from "../../stores/settings";
import { Hint } from "../Hint";
import { InfoTip } from "../InfoTip";
import { GenerateBar } from "./GenerateBar";
import { LoraChips } from "./LoraChips";
import { StartImageRow } from "./StartImage";

// Heights per state, as whole literals so Tailwind finds them: lines of text plus the padding.
const HEIGHTS = {
  prompt: {
    slim: "min-h-[calc(2lh+1.25rem)] max-h-[calc(2lh+1.25rem)]",
    open: "min-h-[calc(2lh+1.25rem)] max-h-[40vh]",
  },
  negativePrompt: {
    slim: "min-h-[calc(1lh+1.25rem)] max-h-[calc(1lh+1.25rem)]",
    open: "min-h-[calc(2lh+1.25rem)] max-h-[25vh]",
  },
};

// Slim boxes that hold more text than they show fade out at the bottom edge.
const FADE =
  "overflow-hidden data-[overflow=true]:[mask-image:linear-gradient(to_bottom,black_calc(100%-1.75rem),transparent_calc(100%-0.25rem))]";

const BOX_IDS = ["prompt", "negative-prompt"];

function isBox(target: EventTarget | null): target is HTMLTextAreaElement {
  return target instanceof HTMLTextAreaElement && BOX_IDS.includes(target.id);
}

/**
 * One prompt box. Slim, it shows its first lines; open, it grows with its text. The frame
 * sits on a wrapper so the fade only touches the text, not the border.
 */
function PromptBox({
  id,
  field,
  placeholder,
  open,
}: {
  id: string;
  field: "prompt" | "negativePrompt";
  placeholder: string;
  open: boolean;
}) {
  const value = useSettings((s) => s[field]);
  const update = useSettings((s) => s.update);
  const box = useRef<HTMLTextAreaElement>(null);

  // Marks whether the text runs past the slim height, for the fade. Rechecked when the
  // text changes and when the width does (a narrower box wraps into more lines).
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const mark = () => {
      el.dataset.overflow = String(el.scrollHeight > el.clientHeight + 1);
    };
    mark();
    const observer = new ResizeObserver(mark);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, open]);

  return (
    <div className="rounded-lg border border-line bg-canvas focus-within:border-line-strong hover:border-line-strong">
      <textarea
        ref={box}
        id={id}
        value={value}
        onChange={(e) => update({ [field]: e.target.value })}
        onKeyDown={(e) => {
          // Esc leaves the box, which slims the card. While generating, Esc stops instead.
          if (e.key === "Escape" && !isRunning()) e.currentTarget.blur();
        }}
        placeholder={placeholder}
        spellCheck={false}
        className={`block w-full resize-none bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-fg-strong placeholder:text-faint focus:outline-none [field-sizing:content] ${
          open ? HEIGHTS[field].open : `${HEIGHTS[field].slim} ${FADE}`
        }`}
      />
    </div>
  );
}

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
 *
 * Long prompts would squeeze the image, so the boxes stay slim until clicked. An open card
 * floats over the image instead of pushing it: its slot keeps the slim card's height.
 */
export function PromptFields({ connected }: { connected: boolean }) {
  const prompt = useSettings((s) => s.prompt);
  const negativePrompt = useSettings((s) => s.negativePrompt);
  const negativeOpen = useSettings((s) => s.negativeOpen);
  const setNegativeOpen = useSettings((s) => s.setNegativeOpen);
  const showLoras = useSettings((s) => !s.hiddenSections.includes("loras"));
  const above = usePreferences((s) => s.promptPosition) === "above";
  // Dismissing hides the offer until the prompt text changes.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const offerApply = looksLikeGenerationData(prompt) && dismissedFor !== prompt;
  // The slim card's height while the open card floats; null while slim.
  const [slotHeight, setSlotHeight] = useState<number | null>(null);
  const slot = useRef<HTMLDivElement>(null);
  const editing = slotHeight !== null;

  const slim = () => {
    for (const id of BOX_IDS) {
      const el = document.getElementById(id);
      if (el) el.scrollTop = 0;
    }
    setSlotHeight(null);
  };

  // Clicking into a box opens the card. Moving between controls inside it keeps it open,
  // so nothing shifts under the pointer mid-click; leaving the card slims it again.
  const onFocus = (event: FocusEvent<HTMLElement>) => {
    if (isBox(event.target) && !editing) setSlotHeight(slot.current?.offsetHeight ?? null);
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (editing && !event.currentTarget.contains(event.relatedTarget)) slim();
  };

  return (
    <div ref={slot} className="relative z-30" style={slotHeight === null ? undefined : { height: slotHeight }}>
      <section
        aria-label="Prompt"
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={(event) => {
          // Generating means looking at the image, so the card makes room for it.
          if (editing && (event.target as Element).closest("[data-generate]")) slim();
        }}
        className={`flex flex-col gap-3 rounded-xl border border-accent/45 bg-surface p-4 shadow-[0_0_0_0_transparent] focus-within:border-accent/80 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)] motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 ${
          editing ? `absolute inset-x-0 ${above ? "top-0" : "bottom-0"}` : ""
        }`}
      >
        <StartImageRow />
        <div className="flex h-6 items-center gap-1.5">
          <label htmlFor="prompt" className="text-[13px] font-medium text-fg-strong">
            Prompt
          </label>
          <InfoTip topic="the prompt" text={HELP.prompt} />
          <div className="ml-auto flex items-center gap-0.5">
            <ClearButton field="prompt" label="Prompt" />
            <SwapPositionButton />
          </div>
        </div>
        <div className="-mt-1">
          <PromptBox id="prompt" field="prompt" placeholder="Describe the image…" open={editing} />
        </div>
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
              <PromptBox id="negative-prompt" field="negativePrompt" placeholder="What to avoid…" open={editing} />
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
        <GenerateBar connected={connected} />
      </section>
    </div>
  );
}
