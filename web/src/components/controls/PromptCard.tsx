import { Eraser } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { isRunning } from "../../stores/generation";
import { usePreferences } from "../../stores/preferences";
import { useSession } from "../../stores/session";
import { useSettings } from "../../stores/settings";
import { Hint } from "../Hint";
import { InfoTip } from "../InfoTip";

type Field = "prompt" | "negativePrompt";

// A slim box shows two lines of text plus its padding, as a whole literal so Tailwind finds it.
const SLIM = "min-h-[calc(2lh+1.125rem)] max-h-[calc(2lh+1.125rem)]";
// An open box grows with its text up to this share of the window, and scrolls beyond it.
const OPEN_SHARE = 0.4;
// How long a box takes to open or close; matches the box's duration-200.
const GLIDE_MS = 200;

// Slim boxes that hold more text than they show fade out at the bottom edge.
const FADE =
  "overflow-hidden data-[overflow=true]:[mask-image:linear-gradient(to_bottom,black_calc(100%-1.75rem),transparent_calc(100%-0.25rem))]";

function glideMs(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : GLIDE_MS;
}

function overflows(el: HTMLElement): boolean {
  return el.scrollHeight > el.clientHeight + 1;
}

/** Empties one prompt field, with an Undo in the message that follows. */
function ClearButton({ id, field, label }: { id: string; field: Field; label: string }) {
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
    document.getElementById(id)?.focus();
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

/** The card's text. Slim, it shows its first lines; open, it glides to the height of its text. */
function PromptBox({
  id,
  field,
  placeholder,
  open,
  onNeedsRoom,
}: {
  id: string;
  field: Field;
  placeholder: string;
  open: boolean;
  /** Called when the focused slim box holds more text than it shows. */
  onNeedsRoom: () => void;
}) {
  const value = useSettings((s) => s[field]);
  const update = useSettings((s) => s.update);
  const box = useRef<HTMLTextAreaElement>(null);

  // Open, the box's height limit follows its text, so a new line glides in too. Slim, it
  // marks whether the text runs past the slim height, for the fade, and asks for room when
  // typing runs past it. Rechecked when the text changes and when the width does (a
  // narrower box wraps into more lines).
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      if (open) {
        el.style.maxHeight = `${Math.min(el.scrollHeight, window.innerHeight * OPEN_SHARE)}px`;
        return;
      }
      el.style.maxHeight = "";
      const overflow = overflows(el);
      el.dataset.overflow = String(overflow);
      if (overflow && document.activeElement === el) onNeedsRoom();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, open, onNeedsRoom]);

  // A scrollbar would flash while the box grows, so it may only appear once the box is open.
  // Closing, the text scrolls back to its start as the box slims.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (!open) {
      el.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    el.style.overflowY = "hidden";
    const timer = window.setTimeout(() => (el.style.overflowY = ""), glideMs());
    return () => {
      window.clearTimeout(timer);
      el.style.overflowY = "";
    };
  }, [open]);

  return (
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
      className={`block w-full resize-none bg-transparent px-4 pt-1.5 pb-3 text-[14px] leading-relaxed text-fg-strong placeholder:text-faint focus:outline-none [field-sizing:content] ${SLIM} motion-safe:transition-[max-height] motion-safe:duration-200 motion-safe:ease-out ${
        open ? "" : FADE
      }`}
    />
  );
}

/**
 * The prompt or the negative prompt as a card of its own; the card is the text field. It
 * lights up in the accent color while in use.
 *
 * Long text would squeeze the image, so the card stays slim. Clicking into text that doesn't
 * fit opens it: the card floats over the image and glides out to show all the text, while its
 * slot keeps the slim height so nothing else moves.
 */
export function PromptCard({
  id,
  field,
  label,
  placeholder,
  help,
  helpTopic,
  actions,
  children,
}: {
  id: string;
  field: Field;
  label: string;
  placeholder: string;
  help: string;
  helpTopic: string;
  /** Extra buttons at the right end of the header. */
  actions?: ReactNode;
  /** Shown under the text, inside the card. */
  children?: ReactNode;
}) {
  const above = usePreferences((s) => s.promptPosition) === "above";
  // The slim card's height while the card floats; null while it sits in place.
  const [slotHeight, setSlotHeight] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const floating = slotHeight !== null;

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const openUp = useCallback(() => {
    window.clearTimeout(settle.current);
    const height = slot.current?.getBoundingClientRect().height ?? null;
    setSlotHeight((current) => current ?? height);
    setOpen(true);
  }, []);

  // The card keeps floating until it has glided back, so the image never shifts.
  const close = () => {
    setOpen(false);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => setSlotHeight(null), glideMs());
  };

  // Moving to the card's buttons keeps it open, so nothing shifts under the pointer
  // mid-click; leaving the card (Generate included) slims it again.
  const onFocus = (event: FocusEvent<HTMLElement>) => {
    if (!open && event.target.id === id && overflows(event.target)) openUp();
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (open && !event.currentTarget.contains(event.relatedTarget)) close();
  };
  // The whole card is the text field: a click on its bare parts puts the cursor in the text.
  const onMouseDown = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as Element).closest("button, a, input, textarea, label")) return;
    event.preventDefault();
    document.getElementById(id)?.focus();
  };

  return (
    <div ref={slot} className="relative z-30 min-w-0" style={slotHeight === null ? undefined : { height: slotHeight }}>
      <section
        aria-label={label}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseDown={onMouseDown}
        className={`flex cursor-text flex-col rounded-xl border border-line bg-surface shadow-[0_0_0_0_transparent] not-focus-within:hover:border-line-strong focus-within:border-accent/80 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)] motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 ${
          floating ? `absolute inset-x-0 ${above ? "top-0" : "bottom-0"}` : ""
        }`}
      >
        <div className="mx-4 mt-3 flex h-6 items-center gap-1.5">
          <label htmlFor={id} className="text-[13px] font-medium text-fg-strong">
            {label}
          </label>
          <InfoTip topic={helpTopic} text={help} />
          <div className="ml-auto flex items-center gap-0.5">
            <ClearButton id={id} field={field} label={label} />
            {actions}
          </div>
        </div>
        <PromptBox id={id} field={field} placeholder={placeholder} open={open} onNeedsRoom={openUp} />
        {children && <div className="mx-3 mb-3 cursor-default">{children}</div>}
      </section>
    </div>
  );
}
