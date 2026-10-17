import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "../Logo";

const EXIT_MS = 320;

/** One part of the card, settling in after `delay` milliseconds. */
function Step({ delay, className, children }: { delay: number; className: string; children: React.ReactNode }) {
  return (
    <div className={`splash-step ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/**
 * The easter egg behind the flame in About, after the title card in Aphanes: the window
 * fades to pure black, then the flame, the name and what the name means settle in one at
 * a time. A click anywhere, or Escape, fades it back out. It is a dialog nested in About,
 * so it takes the keyboard and pointer from About while shown and hands them back after.
 */
export function FlameCard({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (!leaving) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => done.current(), reduce ? 0 : EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && setLeaving(true)}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          onClick={() => setLeaving(true)}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            setLeaving(true);
          }}
          className={`fixed inset-0 z-[70] flex cursor-default flex-col items-center justify-center bg-black text-white outline-none motion-safe:animate-[fade-in_500ms_ease-out] motion-safe:transition-opacity motion-safe:duration-300 ${
            leaving ? "opacity-0" : ""
          }`}
        >
          <div className="flex -translate-y-[10vh] flex-col items-center">
            <Step delay={250} className="">
              <LogoMark className="size-32 text-accent drop-shadow-[0_0_28px_color-mix(in_srgb,var(--accent)_45%,transparent)]" />
            </Step>
            <Step delay={650} className="mt-8">
              <Dialog.Title className="text-[28px] font-light tracking-[5px]">Forgelight</Dialog.Title>
            </Step>
            <Step delay={800} className="mt-2.5 text-[12px] tracking-[1.6px] text-white/70">
              an interface for Stable Diffusion WebUI Forge
            </Step>
            <div className="splash-rule mt-8 h-px w-16 bg-white/25" style={{ animationDelay: "1000ms" }} />
            <Step delay={1150} className="mt-7 text-[16px] tracking-[2px] text-accent">
              forge · light
            </Step>
            <Step delay={1300} className="mt-2 text-[12px] tracking-[1.2px] text-white/55">
              where images are made · made light to use
            </Step>
          </div>
          <Step
            delay={1900}
            className="absolute inset-x-0 bottom-7 text-center text-[11px] tracking-[0.8px] text-white/30"
          >
            Click anywhere to return
          </Step>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
