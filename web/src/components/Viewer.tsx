import { ImageIcon, PlugZap } from "lucide-react";
import type { ConnectionState } from "../api/queries";

const MESSAGES: Record<ConnectionState, { title: string; detail: string }> = {
  connecting: { title: "Connecting to Forge…", detail: "" },
  connected: { title: "No image yet", detail: "Your images will appear here, as large as the screen allows." },
  "api-off": {
    title: "Forge's API is switched off",
    detail: "Restart Forge with the --api option so Forgelight can talk to it.",
  },
  offline: { title: "Forge isn't running", detail: "Start Forge, and this page reconnects by itself." },
};

/** The main image area. For now it shows an empty state that reflects the connection. */
export function Viewer({ connection }: { connection: ConnectionState }) {
  const { title, detail } = MESSAGES[connection];
  const Icon = connection === "connected" || connection === "connecting" ? ImageIcon : PlugZap;

  return (
    <main className="grid h-full place-items-center bg-viewer p-8">
      <div className="flex max-w-xs flex-col items-center gap-3 text-center">
        <Icon className="size-8 text-faint" strokeWidth={1.25} aria-hidden />
        <p className="text-[15px] font-medium text-fg">{title}</p>
        {detail && <p className="text-[13px] leading-relaxed text-muted">{detail}</p>}
      </div>
    </main>
  );
}
