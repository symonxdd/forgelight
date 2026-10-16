import { X } from "lucide-react";
import { useEffect } from "react";
import { dismissError } from "../stores/generation";
import { useSession } from "../stores/session";
import { GenerateBar } from "./controls/GenerateBar";
import { PromptFields } from "./controls/PromptFields";
import { SamplingSection } from "./controls/SamplingSection";
import { SizeSection } from "./controls/SizeSection";

const NOTICE_MS = 6000;

function Message({
  tone,
  text,
  onDismiss,
}: {
  tone: "error" | "warning" | "info";
  text: string;
  onDismiss: () => void;
}) {
  const toneClass =
    tone === "error"
      ? "border-bad/30 bg-bad/8"
      : tone === "warning"
        ? "border-line-strong bg-raised"
        : "border-line bg-raised";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mx-4 mb-3 flex items-start gap-2 rounded-lg border p-3 ${toneClass}`}
    >
      <p className="flex-1 text-[13px] leading-relaxed text-fg">{text}</p>
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

function Messages() {
  const job = useSession((s) => s.job);
  const notice = useSession((s) => s.notice);
  const setNotice = useSession((s) => s.setNotice);

  // Short confirmations fade away by themselves; warnings stay until dismissed.
  useEffect(() => {
    if (notice?.tone !== "info") return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);

  if (job.status === "error") return <Message tone="error" text={job.message} onDismiss={dismissError} />;
  if (notice) return <Message tone={notice.tone} text={notice.text} onDismiss={() => setNotice(null)} />;
  return null;
}

export function ControlsPanel({ connected }: { connected: boolean }) {
  return (
    <aside aria-label="Generation settings" className="flex h-full flex-col bg-canvas">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PromptFields />
        <SizeSection />
        <SamplingSection />
      </div>
      <Messages />
      <GenerateBar connected={connected} />
    </aside>
  );
}
