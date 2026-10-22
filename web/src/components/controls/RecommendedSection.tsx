import { Check, ChevronDown, Lightbulb } from "lucide-react";
import { useMemo, useState } from "react";
import { useModels, type ModelEntry } from "../../api/forgelight";
import { useCurrentCheckpoint, useSamplers, useSchedulers, useUpscalers } from "../../api/queries";
import { pickRemembered } from "../../lib/checkpointMemory";
import { HELP, HELP_NOTES } from "../../lib/help";
import { displayName } from "../../lib/modelNames";
import { describeSettings, isApplied, notesExcerpt, recommend, type Recommendation } from "../../lib/recommended";
import { useSession } from "../../stores/session";
import { useSettings } from "../../stores/settings";
import { CivitaiLink } from "../CivitaiLink";
import { Section } from "./Section";

function useCheckpointEntry(): ModelEntry | undefined {
  const models = useModels();
  const { checkpoint } = useCurrentCheckpoint(true);
  return models.data?.checkpoints.find((m) => m.title === checkpoint?.title);
}

function useRecommendation(entry: ModelEntry | undefined): Recommendation | null {
  const samplers = useSamplers();
  const schedulers = useSchedulers();
  const upscalers = useUpscalers();
  const examples = entry?.civitai.examples;
  return useMemo(
    () =>
      examples
        ? recommend(examples, {
            samplers: samplers.data ?? [],
            schedulers: schedulers.data ?? [],
            upscalers: upscalers.data ?? [],
          })
        : null,
    [examples, samplers.data, schedulers.data, upscalers.data],
  );
}

/** Why there is nothing to recommend, or null when there is. */
function statusText(entry: ModelEntry, recommendation: Recommendation | null): string | null {
  const { status, refreshing } = entry.civitai;
  if (recommendation) return null;
  if (status === "pending" || refreshing) return "Looking up on Civitai…";
  if (status === "not_found") return "This checkpoint isn't on Civitai, so there are no recommendations.";
  if (status === "error") return "Civitai couldn't be reached. It is tried again later.";
  return "The creator's example images on Civitai carry no settings.";
}

function Notes({ lines }: { lines: string[] }) {
  return (
    <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md bg-raised px-3 py-2 text-[12px] leading-relaxed text-muted">
      {lines.map((line, index) => (
        <li key={index} className="break-words">
          {line}
        </li>
      ))}
    </ul>
  );
}

/**
 * Settings the selected checkpoint's creator used for their example images on Civitai,
 * with one button to copy them in. Drawn as a suggestion (a dashed outline on the page
 * background) so it never reads as one of the cards where settings are changed. It folds
 * and hides like the cards.
 */
export function RecommendedSection() {
  const open = useSettings((s) => s.openSections.recommended);
  const setSectionOpen = useSettings((s) => s.setSectionOpen);
  const update = useSettings((s) => s.update);
  const current = useSettings();
  const [notesOpen, setNotesOpen] = useState(false);
  const entry = useCheckpointEntry();
  const recommendation = useRecommendation(entry);
  if (!entry) return null;

  const { name } = displayName(entry.stem, entry.civitai);
  const { method, size, hires } = describeSettings(recommendation?.settings ?? {});
  const notes = notesExcerpt([entry.civitai.notes, entry.civitai.versionNotes].filter(Boolean).join("\n"));
  const applied = recommendation ? isApplied(recommendation.settings, pickRemembered(current)) : false;
  const status = statusText(entry, recommendation);

  const apply = () => {
    if (!recommendation) return;
    const before = pickRemembered(useSettings.getState());
    update(recommendation.settings);
    useSession.getState().setNotice({
      tone: "info",
      text: `Applied the recommended settings for ${name}.`,
      action: { label: "Undo", run: () => useSettings.getState().update(before) },
    });
  };

  const action =
    recommendation &&
    (applied ? (
      <span className="flex h-7 items-center gap-1 text-[12px] whitespace-nowrap text-muted">
        <Check className="size-3.5 text-accent" aria-hidden />
        In use
      </span>
    ) : (
      <button
        type="button"
        onClick={apply}
        className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-[12px] font-medium text-on-primary hover:bg-primary-hover"
      >
        Apply
      </button>
    ));

  return (
    <Section
      title="Recommended"
      icon={Lightbulb}
      help={HELP.recommended}
      helpNote={HELP_NOTES.recommended}
      summary={recommendation ? method : (status ?? undefined)}
      suggestion
      open={open}
      onOpenChange={(o) => setSectionOpen("recommended", o)}
      action={action}
    >
      {recommendation ? (
        <div className="flex flex-col gap-0.5">
          {method && <p className="text-[13px] text-fg">{method}</p>}
          {size && <p className="text-[13px] text-fg">{size}</p>}
          {hires && <p className="text-[12.5px] text-muted">Hires fix, once switched on: {hires}</p>}
        </div>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-muted">{status}</p>
      )}
      {recommendation?.adetailer && (
        <p className="text-[12px] leading-relaxed text-muted">
          Most examples were also touched up with ADetailer, an extension that redraws faces. Forgelight has no controls
          for it, so results can look a little less polished.
        </p>
      )}
      <div className="flex items-center gap-1.5 text-[12px] whitespace-nowrap text-faint">
        {recommendation && (
          <span className="min-w-0 truncate">
            {recommendation.examples} {recommendation.examples === 1 ? "example" : "examples"}
          </span>
        )}
        {recommendation && notes.length > 0 && <span aria-hidden>·</span>}
        {notes.length > 0 && (
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            aria-expanded={notesOpen}
            className="flex h-7 items-center gap-1 rounded-md text-muted hover:text-fg-strong"
          >
            Creator's notes
            <ChevronDown className={`size-3.5 ${notesOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
        )}
        {entry.civitai.url && (
          <span className="ml-auto">
            <CivitaiLink url={entry.civitai.url} name={name} />
          </span>
        )}
      </div>
      {notesOpen && <Notes lines={notes} />}
    </Section>
  );
}
