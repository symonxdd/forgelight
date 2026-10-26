import { Code, ExternalLink, Globe } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LogoMark } from "../Logo";
import { UpdateStatus } from "../updates/UpdateStatus";
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

/** Who made Forgelight and where it lives, signed the same way as Symon's other apps. The settings window's last page. */
export function AboutPage({ onOpenUpdate }: { onOpenUpdate: () => void }) {
  const [flame, setFlame] = useState(false);

  return (
    <div className="flex flex-col">
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
          <h2 className="text-[17px] font-semibold tracking-tight text-fg-strong">Forgelight</h2>
          <span className="text-[12px] text-muted tabular-nums">Version {__APP_VERSION__}</span>
        </div>
      </div>
      <div className="mt-3">
        <UpdateStatus onOpenUpdate={onOpenUpdate} />
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-fg">
        A calm, minimal interface for Stable Diffusion WebUI Forge. Every image is still made by Forge itself, exactly
        as on its classic page.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Free, with no ads and no tracking. Not affiliated with lllyasviel or the Forge project.
      </p>

      <div className="mt-5 flex flex-col">
        <span className="text-[11px] font-medium tracking-wide text-faint uppercase">Developer</span>
        <span className="mt-0.5 text-[15px] font-medium text-fg-strong">symonxd 🤍</span>
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
    </div>
  );
}
