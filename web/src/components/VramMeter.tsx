import { useSystemLive } from "../api/system";
import { formatGb, share } from "../lib/system";
import { useSettingsWindow } from "../stores/settingsWindow";
import { Hint } from "./Hint";

/** VRAM in use, in the top bar: a bar and the number. The hint adds RAM and the card; a click opens Settings > System. */
export function VramMeter({ connected }: { connected: boolean }) {
  const live = useSystemLive(connected);
  const setPage = useSettingsWindow((s) => s.setPage);
  const data = live.data;
  const vram = data?.vram;
  // Without an Nvidia card there is nothing to show.
  if (!connected || (data && !vram)) return null;

  const hint =
    data && vram ? (
      <span className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 py-0.5 tabular-nums">
        <span className="opacity-70">VRAM</span>
        <span>
          {formatGb(vram.used)} used of {formatGb(vram.total)}
        </span>
        <span className="opacity-70">RAM</span>
        <span>
          {formatGb(data.ram.used)} used of {formatGb(data.ram.total)}
        </span>
        {data.gpu && (
          <>
            <span className="opacity-70">Graphics card</span>
            <span>
              {data.gpu.temperature} °C · {data.gpu.load}% busy
            </span>
          </>
        )}
        <span className="col-span-2 pt-1 opacity-70">Click for details.</span>
      </span>
    ) : (
      ""
    );

  return (
    <Hint label={hint}>
      <button
        type="button"
        onClick={() => setPage("system")}
        aria-label={
          vram
            ? `VRAM: ${formatGb(vram.used)} used of ${formatGb(vram.total)}. Opens the System page in Settings`
            : "VRAM"
        }
        className="hidden h-7 items-center gap-2 rounded-md border border-line px-2 text-[12.5px] text-fg tabular-nums hover:border-line-strong md:flex"
      >
        <span className="h-1 w-10 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${vram ? share(vram.used, vram.total) * 100 : 0}%` }}
          />
        </span>
        {/* A fixed width, so a changing number never moves the controls beside it. */}
        <span className="w-[3.6rem] text-right">{vram ? formatGb(vram.used) : ""}</span>
      </button>
    </Hint>
  );
}
