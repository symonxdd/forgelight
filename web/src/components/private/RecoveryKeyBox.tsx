import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** A recovery key to write down, with a Copy button, and the "saved it" checkbox under it. */
export function RecoveryKeyBox({
  code,
  saved,
  onSavedChange,
}: {
  code: string;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // The key stays on screen to write down.
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas py-2 pr-2 pl-3">
        <code className="min-w-0 flex-1 font-mono text-[13px] tracking-wide break-all text-fg-strong select-all">
          {code}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12px] text-fg hover:border-line-strong hover:text-fg-strong"
        >
          {copied ? <Check className="size-3.5 text-accent" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-fg">
        <input
          id="private-recovery-saved"
          type="checkbox"
          checked={saved}
          onChange={(e) => onSavedChange(e.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
        I've saved it somewhere safe
      </label>
    </>
  );
}
