import { CircleAlert, CircleCheck, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useSession, type Notice, type ShownNotice } from "../../stores/session";

const ICONS: Record<Notice["tone"], LucideIcon> = { info: CircleCheck, warning: TriangleAlert, error: CircleAlert };
const ICON_COLOR: Record<Notice["tone"], string> = { info: "text-accent", warning: "text-warn", error: "text-bad" };

function Message({ notice }: { notice: ShownNotice }) {
  const dismissNotice = useSession((s) => s.dismissNotice);
  const removeNotice = useSession((s) => s.removeNotice);
  // Clipped only while its slot opens or closes, so the shadow shows the rest of the time.
  const [opening, setOpening] = useState(true);
  const Icon = ICONS[notice.tone];
  const dismiss = () => dismissNotice(notice.id);

  return (
    // The slot opens and closes its height, so the messages below glide instead of jumping.
    <div
      className={`grid justify-items-end ${notice.leaving ? "toast-close" : "toast-open"}`}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (notice.leaving) removeNotice(notice.id);
        else setOpening(false);
      }}
    >
      <div className={`min-h-0 ${opening || notice.leaving ? "overflow-hidden" : ""}`}>
        <div className="pb-2">
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={`group pointer-events-auto relative flex items-start gap-2.5 overflow-hidden rounded-[10px] border border-line bg-surface py-[9px] pr-1.5 pl-3 shadow-[0_8px_24px_rgba(15,16,18,0.10),0_1px_3px_rgba(15,16,18,0.06)] dark:border-line-strong dark:bg-raised dark:shadow-[0_10px_30px_rgba(0,0,0,0.7)] ${
              notice.leaving ? "toast-lift" : "toast-drop"
            }`}
          >
            <Icon className={`mt-0.5 size-4 shrink-0 ${ICON_COLOR[notice.tone]}`} aria-hidden />
            <p className="min-w-0 flex-1 text-[13px] leading-5 text-fg-strong">{notice.text}</p>
            {notice.action && (
              <button
                type="button"
                onClick={() => {
                  notice.action?.run();
                  dismiss();
                }}
                className="h-[22px] shrink-0 rounded-md px-2 text-[12.5px] font-semibold text-accent hover:bg-raised dark:hover:bg-line-strong"
              >
                {notice.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="grid size-[22px] shrink-0 place-items-center rounded text-faint hover:text-fg-strong"
            >
              <X className="size-3.5" aria-hidden />
            </button>
            {/* Confirmations leave by themselves when this line runs out, but not while pointed at,
                so there is time to read them or click Undo. Warnings and errors stay. */}
            {notice.tone === "info" && !notice.leaving && (
              <div
                aria-hidden
                onAnimationEnd={dismiss}
                className="toast-timer absolute bottom-0 left-0 h-0.5 bg-accent/55 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Messages in the top right corner of the area below the top bar, on every screen: up to
 * three, newest on top. The parent needs `relative`; clicks pass through everywhere except
 * the messages themselves.
 */
export function FloatingMessages() {
  const notices = useSession((s) => s.notices);
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-30 flex w-[min(19.5rem,calc(100%-1.5rem))] flex-col">
      {notices.map((notice) => (
        <Message key={notice.id} notice={notice} />
      ))}
    </div>
  );
}
