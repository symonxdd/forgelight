import { ImageIcon, LoaderCircle, PlugZap } from "lucide-react";
import type { ConnectionState } from "../../api/queries";
import { barFraction, barPulses, isLoading, progressLabel } from "../../lib/progress";
import { selectedImage, useSession } from "../../stores/session";
import { useViewer } from "../../stores/viewer";
import { ProgressText } from "../ProgressText";
import { ImageStage } from "./ImageStage";
import { InfoDrawer } from "./InfoDrawer";
import { ViewerToolbar } from "./ViewerToolbar";

const MESSAGES: Record<ConnectionState, { title: string; detail: string }> = {
  connecting: { title: "Connecting to Forge…", detail: "" },
  connected: { title: "No image yet", detail: "Your images will appear here." },
  "api-off": {
    title: "Forge's API is switched off",
    detail:
      "Start Forge with the Forgelight desktop shortcut (created in the settings menu), or add --api to COMMANDLINE_ARGS in webui-user.bat and restart Forge.",
  },
  offline: { title: "Forge isn't running", detail: "Start Forge, and this page reconnects by itself." },
};

const CLEARED = { title: "Nothing shown", detail: "Pick an image in the Session strip to see it again." };

function EmptyState({ connection, cleared }: { connection: ConnectionState; cleared: boolean }) {
  const { title, detail } = cleared && connection === "connected" ? CLEARED : MESSAGES[connection];
  const Icon = connection === "connected" || connection === "connecting" ? ImageIcon : PlugZap;
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="flex max-w-xs flex-col items-center gap-3 text-center">
        <Icon className="size-8 text-faint" strokeWidth={1.25} aria-hidden />
        <p className="text-[15px] font-medium text-fg">{title}</p>
        {detail && <p className="text-[13px] leading-relaxed text-muted">{detail}</p>}
      </div>
    </div>
  );
}

/** The main image area: live preview while generating, then the selected image. */
export function Viewer({ connection }: { connection: ConnectionState }) {
  const job = useSession((s) => s.job);
  const image = useSession(selectedImage);
  const infoOpen = useViewer((s) => s.infoOpen);
  const handoff = useSession((s) => s.handoff);
  const cleared = useSession((s) => s.cleared && s.images.length > 0);
  const clearView = useSession((s) => s.clearView);
  const running = job.status === "running";

  let stage = null;
  if (running && job.previewUrl) {
    stage = (
      <ImageStage
        key="live"
        imageKey="live"
        src={job.previewUrl}
        width={job.width}
        height={job.height}
        alt="Live preview"
      />
    );
  } else if (running) {
    stage = (
      <div className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <LoaderCircle className="size-6 animate-spin text-faint" aria-hidden />
          <p className="text-[13px]">
            <ProgressText label={progressLabel(job)} />
          </p>
          {isLoading(job) && (
            <div className="h-1 w-56 overflow-hidden rounded-full bg-raised" aria-hidden>
              <div
                className={`h-full rounded-full bg-accent ${barPulses(job) ? "motion-safe:animate-pulse" : ""}`}
                style={{ width: `${Math.max(barFraction(job), barPulses(job) ? 1 : 0) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  } else if (image) {
    const fresh = handoff?.imageId === image.id;
    stage = (
      <ImageStage
        key={image.id}
        imageKey={image.id}
        src={image.url}
        underlay={fresh ? handoff.previewUrl : null}
        fadeIn={fresh}
        width={image.width}
        height={image.height}
        alt={`Generated image, seed ${image.seed}`}
      />
    );
  }

  return (
    <main data-viewer-root data-shortcuts="viewer" className="flex h-full overflow-hidden bg-viewer">
      <div className="relative min-w-0 flex-1">
        {stage ?? <EmptyState connection={connection} cleared={cleared} />}
        {running && (
          <div className="absolute inset-x-0 top-0 h-0.5" aria-hidden>
            <div className="h-full bg-accent" style={{ width: `${barFraction(job) * 100}%` }} />
          </div>
        )}
        {(image || running) && <ViewerToolbar image={running ? undefined : image} onClear={clearView} />}
      </div>
      {infoOpen && image && !running && <InfoDrawer image={image} />}
    </main>
  );
}
