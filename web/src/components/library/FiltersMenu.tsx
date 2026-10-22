import { ChevronDown, ListFilter } from "lucide-react";
import { Popover } from "radix-ui";
import { useCallback, useMemo } from "react";
import { useModels } from "../../api/forgelight";
import { HELP } from "../../lib/help";
import { displayName, tidyName } from "../../lib/modelNames";
import { LIBRARY_BLUR_CHOICES, LIBRARY_RATINGS, parseLibraryBlur } from "../../lib/preferences";
import { usePreferences } from "../../stores/preferences";
import { InfoTip } from "../InfoTip";
import { SelectMenu } from "../SelectMenu";

const ALL = "__all";
const select =
  "h-8 w-44 rounded-md border border-line bg-canvas px-2.5 text-[13px] text-fg-strong hover:border-line-strong";

/** Readable names for the checkpoints named in images, using Civitai's name when known. */
function useModelLabels(): (name: string) => string {
  const models = useModels();
  const byStem = useMemo(
    () => new Map((models.data?.checkpoints ?? []).map((m) => [m.stem, displayName(m.stem, m.civitai).name])),
    [models.data],
  );
  return useCallback((name: string) => byStem.get(name) ?? tidyName(name), [byStem]);
}

function Row({ label, id, children }: { label: React.ReactNode; id: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span id={id} className="flex items-center gap-1.5 text-[12.5px] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * The Library's narrowing choices in one menu: checkpoint and content, plus how previews
 * show (blur). A dot on the button tells that something narrows the list.
 */
export function FiltersMenu({
  model,
  models,
  onModelChange,
}: {
  model: string;
  models: { name: string; count: number }[];
  onModelChange: (model: string) => void;
}) {
  const label = useModelLabels();
  const rating = usePreferences((s) => s.libraryRating);
  const setRating = usePreferences((s) => s.setLibraryRating);
  const blur = usePreferences((s) => s.libraryBlur);
  const setBlur = usePreferences((s) => s.setLibraryBlur);
  const active = Boolean(model) || rating !== "all";

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={active ? "Filters, some set" : "Filters"}
        className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] data-[state=open]:border-line-strong ${
          active
            ? "border-line-strong bg-raised text-fg-strong"
            : "border-line text-muted hover:border-line-strong hover:text-fg-strong"
        }`}
      >
        <ListFilter className="size-3.5" aria-hidden />
        Filters
        {active && <span className="size-1.5 rounded-full bg-accent" aria-hidden />}
        <ChevronDown className="size-3.5" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
          // The dropdowns inside open in their own layer; choosing there keeps this menu open.
          onInteractOutside={(event) => {
            if ((event.target as HTMLElement | null)?.closest("[role='menu']")) event.preventDefault();
          }}
          className="z-50 flex w-80 flex-col gap-3 rounded-lg border border-line bg-surface p-3.5 text-fg shadow-lg shadow-black/15"
        >
          <Row label="Checkpoint" id="filter-checkpoint">
            <SelectMenu
              value={model || ALL}
              options={[
                { value: ALL, label: "All checkpoints" },
                ...models.map((m) => ({ value: m.name, label: label(m.name) })),
              ]}
              onChange={(v) => onModelChange(v === ALL ? "" : v)}
              aria-labelledby="filter-checkpoint"
              align="end"
              className={select}
            />
          </Row>
          <Row
            id="filter-content"
            label={
              <>
                Content
                <InfoTip topic="the content filter" text={HELP.libraryContent} side="left" />
              </>
            }
          >
            <div
              role="radiogroup"
              aria-labelledby="filter-content"
              className="flex h-8 w-44 items-center rounded-md border border-line bg-canvas p-0.5"
            >
              {LIBRARY_RATINGS.map(({ id, label: text }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={rating === id}
                  onClick={() => setRating(id)}
                  className={`h-full flex-1 rounded-[5px] text-[12.5px] ${
                    rating === id ? "bg-raised font-medium text-fg-strong" : "text-muted hover:text-fg-strong"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Blur previews" id="filter-blur">
            <SelectMenu
              value={blur}
              options={LIBRARY_BLUR_CHOICES.map(({ id, label: text }) => ({ value: id, label: text }))}
              onChange={(v) => setBlur(parseLibraryBlur(v))}
              aria-labelledby="filter-blur"
              align="end"
              className={select}
            />
          </Row>
          <button
            type="button"
            disabled={!active}
            onClick={() => {
              onModelChange("");
              setRating("all");
            }}
            className="self-end text-[12.5px] text-muted hover:text-fg-strong disabled:opacity-40 disabled:hover:text-muted"
          >
            Reset filters
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
