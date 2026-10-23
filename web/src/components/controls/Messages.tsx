import { CircleAlert, CircleCheck, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { dismissError } from "../../stores/generation";
import { useSession, type Notice } from "../../stores/session";

const NOTICE_MS = 6000;
const FADE_MS = 200;

type Tone = "error" | "warning" | "info";

const ICONS: Record<Tone, LucideIcon> = { info: CircleCheck, warning: TriangleAlert, error: CircleAlert };
const ICON_COLOR: Record<Tone, string> = { info: "text-accent", warning: "text-fg-strong", error: "text-bad" };
const TITLES: Record<Tone, string> = { info: "Done", warning: "Heads up", error: "Didn't work" };

function Message({
  tone,
  text,
  title,
  action,
  onDismiss,
  fading = false,
}: {
  tone: Tone;
  title?: string;
  text: string;
  action?: { label: string; run: () => void };
  onDismiss: () => void;
  fading?: boolean;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      // Floats in the image's top right corner, clear of the prompt and the zoom bar. It eases
      // in, and fades out when it leaves by itself.
      className={`flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3 motion-safe:animate-[toast-in_180ms_ease-out] motion-safe:transition-opacity motion-safe:duration-200 ${
        fading ? "opacity-0" : ""
      }`}
    >
      {/* The icon and the close button line up with the title, however long the text below it. */}
      <Icon className={`mt-0.5 size-4 shrink-0 ${ICON_COLOR[tone]}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[13px] leading-5 font-medium text-fg-strong">{title ?? TITLES[tone]}</p>
        <p className={`text-[12.5px] leading-snug ${tone === "error" ? "text-bad" : "text-muted"}`}>{text}</p>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.run();
              onDismiss();
            }}
            className="mt-1 h-7 self-start rounded-md border border-line px-2.5 text-[12px] text-fg-strong hover:border-line-strong"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mt-0.5 grid size-6 shrink-0 place-items-center rounded text-faint hover:text-fg-strong"
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
          title={notice.title}
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

/**
 * Messages in the top right corner of the area below the top bar, on every screen. The
 * parent needs `relative`; clicks pass through everywhere except the message itself.
 */
export function FloatingMessages() {
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-30 w-[min(20rem,calc(100%-1.5rem))]">
      <div className="pointer-events-auto">
        <Messages />
      </div>
    </div>
  );
}
