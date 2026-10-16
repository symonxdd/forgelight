/** Thumbnails of this session's images, newest first. Filled in with the generate screen. */
export function HistoryRail() {
  return (
    <aside aria-label="History" className="flex h-full flex-col bg-canvas">
      <h2 className="px-4 pt-5 pb-2 text-xs font-medium tracking-wide text-muted uppercase">History</h2>
      <p className="px-4 text-[13px] text-faint">Nothing yet</p>
    </aside>
  );
}
