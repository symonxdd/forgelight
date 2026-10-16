import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { parseInfotext, settingsFromInfotext } from "../../lib/infotext";
import type { SessionImage } from "../../stores/session";
import { useSettings } from "../../stores/settings";
import { useViewer } from "../../stores/viewer";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className="grid size-6 place-items-center rounded text-muted hover:bg-raised hover:text-fg-strong"
    >
      {copied ? <Check className="size-3.5 text-good" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </button>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h3>
        {text && <CopyButton text={text} label={`Copy ${title.toLowerCase()}`} />}
      </div>
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-fg-strong">
        {text || <span className="text-faint">None</span>}
      </p>
    </div>
  );
}

/** The settings an image was made with, and buttons to reuse them. */
export function InfoDrawer({ image }: { image: SessionImage }) {
  const setInfoOpen = useViewer((s) => s.setInfoOpen);
  const update = useSettings((s) => s.update);
  const parsed = parseInfotext(image.infotext);

  return (
    <aside aria-label="Image info" className="flex w-80 max-w-[50%] shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-[13px] font-medium text-fg-strong">Image info</h2>
        <button
          type="button"
          onClick={() => setInfoOpen(false)}
          aria-label="Close image info"
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg-strong"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
        <TextBlock title="Prompt" text={parsed.prompt} />
        <TextBlock title="Negative prompt" text={parsed.negativePrompt} />
        {parsed.params.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            {parsed.params.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="min-w-0 break-words text-fg-strong">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="flex gap-2 border-t border-line p-4">
        <button
          type="button"
          onClick={() => update(settingsFromInfotext(parsed))}
          className="h-9 flex-1 rounded-lg bg-fg-strong text-[13px] font-medium text-canvas hover:bg-fg-strong/90"
        >
          Use these settings
        </button>
        <button
          type="button"
          onClick={() => update({ seed: image.seed })}
          disabled={image.seed < 0}
          className="h-9 rounded-lg border border-line px-3 text-[13px] text-fg hover:bg-raised disabled:opacity-40"
        >
          Use seed
        </button>
      </div>
    </aside>
  );
}
