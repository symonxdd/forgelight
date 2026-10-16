/** Home of the prompt and generation settings, which arrive with the generate screen. */
export function ControlsPanel() {
  return (
    <aside aria-label="Generation settings" className="flex h-full flex-col overflow-y-auto bg-canvas">
      <div className="flex flex-col gap-2 p-5">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">Generate</h2>
        <p className="text-[13px] leading-relaxed text-faint">
          Prompt, size and sampling settings will live here in the next build.
        </p>
      </div>
    </aside>
  );
}
