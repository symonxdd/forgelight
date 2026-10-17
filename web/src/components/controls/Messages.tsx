import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { dismissError } from "../../stores/generation";
import { useSession, type Notice } from "../../stores/session";

const NOTICE_MS = 6000;
const FADE_MS = 200;

function Message({
  tone,
  text,
  action,
  onDismiss,
  fading = false,
}: {
  tone: "error" | "warning" | "info";
  text: string;
  action?: { label: string; run: () => void };
  onDismiss: () => void;
  fading?: boolean;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      // Floats over the image, so it never pushes the prompt card around. It eases in, and
      // fades out when it leaves by itself.
      className={`flex items-center gap-2 rounded-lg border bg-surface py-2.5 pr-2.5 pl-3.5 shadow-lg shadow-black/25 motion-safe:animate-[toast-in_180ms_ease-out] motion-safe:transition-opacity motion-safe:duration-200 ${
        tone === "error" ? "border-bad/45" : "border-line-strong"
      } ${fading ? "opacity-0" : ""}`}
    >
      <p className={`flex-1 text-[13px] leading-relaxed ${tone === "error" ? "text-bad" : "text-fg"}`}>{text}</p>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.run();
            onDismiss();
          }}
          className="h-6 shrink-0 rounded-md px-2 text-[12.5px] font-medium text-fg-strong hover:bg-surface"
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-fg-strong"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function Messages() {
  const job = useSession((s) => s.job);
  const notice = useSession((s) => s.notice);
  const setNotice = useSession((s) => s.setNotice);
  // The notice under the pointer; a new notice is never paused by an old hover.
  const [hovered, setHovered] = useState<Notice | null>(null);
  // The notice fading out on its way away.
  const [fading, setFading] = useState<Notice | null>(null);

  // Short confirmations fade away by themselves, but not while pointed at, so there is time
  // to read them or click Undo. Warnings stay until dismissed.
  useEffect(() => {
    if (notice?.tone !== "info" || hovered === notice) return;
    const timer = setTimeout(() => setFading(notice), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, hovered]);

  useEffect(() => {
    if (!fading || fading !== notice) return;
    const timer = setTimeout(() => setNotice(null), FADE_MS);
    return () => clearTimeout(timer);
  }, [fading, notice, setNotice]);

  if (job.status === "error") return <Message tone="error" text={job.message} onDismiss={dismissError} />;
  if (notice) {
    return (
      <div onPointerEnter={() => setHovered(notice)} onPointerLeave={() => setHovered(null)}>
        <Message
          tone={notice.tone}
          text={notice.text}
          action={notice.action}
          onDismiss={() => setNotice(null)}
          fading={fading === notice}
        />
      </div>
    );
  }
  return null;
}
