import { selectedImage, useSession } from "../stores/session";

/** This session's images, newest first. The full history across sessions comes later. */
export function HistoryRail() {
  const images = useSession((s) => s.images);
  const job = useSession((s) => s.job);
  const shown = useSession(selectedImage);
  const select = useSession((s) => s.select);

  return (
    <aside aria-label="Session" data-shortcuts="viewer" className="flex h-full flex-col bg-canvas">
      <h2 className="flex items-baseline justify-between gap-2 px-4 pt-5 pb-3 text-xs font-medium tracking-wide text-muted uppercase">
        Session
        {images.length > 0 && <span className="font-normal text-faint tabular-nums">{images.length}</span>}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pt-1 pb-3">
        {job.status === "running" && (
          <div
            className="relative overflow-hidden rounded-md bg-raised"
            style={{ aspectRatio: `${job.width} / ${job.height}` }}
            aria-label="Generating"
          >
            {job.previewUrl && <img src={job.previewUrl} alt="" className="size-full object-cover opacity-70" />}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" style={{ width: `${job.progress * 100}%` }} />
          </div>
        )}
        {images.length === 0 && job.status !== "running" && <p className="px-1 text-[13px] text-faint">Nothing yet</p>}
        {images.map((image) => {
          const active = image.id === shown?.id;
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => select(image.id)}
              aria-label={`Image with seed ${image.seed}`}
              aria-current={active}
              className={`shrink-0 overflow-hidden rounded-md outline-offset-2 motion-safe:transition-opacity ${
                active ? "opacity-100" : "opacity-45 hover:opacity-80"
              }`}
              style={{ aspectRatio: `${image.width} / ${image.height}` }}
            >
              <img src={image.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
