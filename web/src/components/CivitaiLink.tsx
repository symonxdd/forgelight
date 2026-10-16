import { ExternalLink } from "lucide-react";
import { civitaiLink } from "../lib/preferences";
import { usePreferences } from "../stores/preferences";
import { Hint } from "./Hint";

/** A small button opening a model's Civitai page on the site chosen in settings. */
export function CivitaiLink({ url, name }: { url: string; name: string }) {
  const site = usePreferences((s) => s.civitaiSite);
  return (
    <Hint label={`Open on civitai.${site}`} side="left">
      <a
        href={civitaiLink(url, site)}
        target="_blank"
        rel="noopener"
        aria-label={`Open ${name} on Civitai`}
        className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-surface hover:text-fg-strong"
      >
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </Hint>
  );
}
