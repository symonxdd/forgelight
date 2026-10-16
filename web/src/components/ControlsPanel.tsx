import { X } from "lucide-react";
import { dismissError } from "../stores/generation";
import { useSession } from "../stores/session";
import { GenerateBar } from "./controls/GenerateBar";
import { PromptFields } from "./controls/PromptFields";
import { SamplingSection } from "./controls/SamplingSection";
import { SizeSection } from "./controls/SizeSection";

function ErrorNotice() {
  const job = useSession((s) => s.job);
  if (job.status !== "error") return null;
  return (
    <div role="alert" className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/8 p-3">
      <p className="flex-1 text-[13px] leading-relaxed text-fg">{job.message}</p>
      <button
        type="button"
        onClick={dismissError}
        aria-label="Dismiss"
        className="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-fg-strong"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function ControlsPanel({ connected }: { connected: boolean }) {
  return (
    <aside aria-label="Generation settings" className="flex h-full flex-col bg-canvas">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PromptFields />
        <SizeSection />
        <SamplingSection />
      </div>
      <ErrorNotice />
      <GenerateBar connected={connected} />
    </aside>
  );
}
