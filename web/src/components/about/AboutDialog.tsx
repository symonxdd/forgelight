import { Code, ExternalLink, Globe, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { LogoMark } from "../Logo";
import { FlameCard } from "./FlameCard";
import { Signature } from "./Signature";

const PORTFOLIO_URL = "https://symon.me";
const GITHUB_URL = "https://github.com/symonxdd/forgelight";

function LinkRow({ href, icon, children }: { href: string; icon: ReactNode; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="flex h-9 items-center gap-2.5 rounded-md px-2 text-[13.5px] text-fg hover:bg-raised hover:text-fg-strong"
    >
      {icon}
      {children}
      <ExternalLink className="ml-auto size-3.5 text-faint" aria-hidden />
    </a>
  );
}

/** Who made Forgelight and where it lives, signed the same way as Symon's other apps. */
export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [flame, setFlame] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-[fade-in_120ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-line bg-surface p-5 text-fg shadow-xl shadow-black/30 motion-safe:animate-[fade-in_120ms_ease-out]"
        >
          <Dialog.Close
            aria-label="Close"
            className="absolute top-3 right-3 grid size-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong"
          >
            <X className="size-4" aria-hidden />
          </Dialog.Close>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFlame(true)}
              aria-label="Light the flame"
              className="grid size-12 place-items-center rounded-xl bg-raised ring-1 ring-line hover:ring-line-strong"
            >
              <LogoMark className="size-7 text-accent" />
            </button>
            <div className="flex flex-col">
              <Dialog.Title className="text-[17px] font-semibold tracking-tight text-fg-strong">
                Forgelight
              </Dialog.Title>
              <span className="text-[12px] text-muted tabular-nums">Version {__APP_VERSION__}</span>
            </div>
          </div>

          <p className="mt-4 text-[13.5px] leading-relaxed text-fg">
            A calm, minimal interface for Stable Diffusion WebUI Forge. Every image is still made by Forge itself,
            exactly as on its classic page.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Free, with no ads and no tracking. Not affiliated with lllyasviel or the Forge project.
          </p>

          <div className="mt-5 flex flex-col">
            <span className="text-[11px] font-medium tracking-wide text-faint uppercase">Developer</span>
            <span className="mt-0.5 text-[15px] font-medium text-fg-strong">Symon 💛</span>
          </div>
          <div className="mt-2 -mx-2 flex flex-col">
            <LinkRow href={PORTFOLIO_URL} icon={<Globe className="size-4 text-muted" aria-hidden />}>
              Portfolio
            </LinkRow>
            <LinkRow href={GITHUB_URL} icon={<Code className="size-4 text-muted" aria-hidden />}>
              GitHub
            </LinkRow>
          </div>

          <div className="my-4 h-px bg-line" />
          <span className="text-[11px] font-medium tracking-wide text-faint uppercase">Things to try</span>
          <button
            type="button"
            onClick={() => setFlame(true)}
            className="mt-2 -mx-2 flex h-9 items-center gap-2.5 rounded-md px-2 text-left text-[13.5px] text-fg hover:bg-raised hover:text-fg-strong"
          >
            <LogoMark className="size-4 text-accent" />
            Click the flame
          </button>

          <div className="mt-5 flex flex-col items-center gap-1.5">
            <Signature />
            <span className="text-[11px] text-faint">Project started in October 2026</span>
          </div>

          {flame && <FlameCard onDone={() => setFlame(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
