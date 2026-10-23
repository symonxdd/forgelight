import { useOptions, useSetOptions } from "../../api/queries";
import { HELP, HELP_NOTES } from "../../lib/help";
import {
  LIVE_PREVIEW_CHOICES,
  currentLivePreview,
  livePreviewSettings,
  type LivePreviewChoice,
} from "../../lib/livePreview";
import { CIVITAI_SITES, parseCivitaiSite } from "../../lib/preferences";
import { useCheckpointMemory } from "../../stores/checkpointMemory";
import { usePreferences } from "../../stores/preferences";
import { Toggle } from "../Toggle";
import { Dropdown, Group, Page, Row } from "./parts";

/** Settings about making images: checkpoint memory, live preview, Civitai links and finding new models. */
export function GeneratingPage() {
  const memoryEnabled = useCheckpointMemory((s) => s.enabled);
  const setMemoryEnabled = useCheckpointMemory((s) => s.setEnabled);
  const options = useOptions();
  const setOptions = useSetOptions();
  const preview = currentLivePreview(options.data?.live_previews_enable, options.data?.show_progress_every_n_steps);
  const previewChoices = LIVE_PREVIEW_CHOICES.map(({ id, label }) => ({ value: id, label }));
  const site = usePreferences((s) => s.civitaiSite);
  const setSite = usePreferences((s) => s.setCivitaiSite);
  const findNewModels = usePreferences((s) => s.findNewModels);
  const setFindNewModels = usePreferences((s) => s.setFindNewModels);

  return (
    <Page title="Generating">
      <Group title="Images">
        <Row id="checkpoint-memory-label" label="Remember per checkpoint" help={HELP.checkpointMemory}>
          <Toggle checked={memoryEnabled} onChange={setMemoryEnabled} labelledBy="checkpoint-memory-label" />
        </Row>
        <Row id="preview-label" label="Live preview" help={HELP.livePreview}>
          <Dropdown
            value={preview ?? ""}
            options={previewChoices}
            onChange={(v) => setOptions.mutate(livePreviewSettings(v as LivePreviewChoice))}
            labelledBy="preview-label"
            disabled={!options.data || setOptions.isPending}
          />
        </Row>
      </Group>
      <Group title="Models">
        <Row id="civitai-site-label" label="Civitai links" help={HELP.civitaiSite}>
          <Dropdown
            value={site}
            options={CIVITAI_SITES.map(({ id, label }) => ({ value: id, label }))}
            onChange={(v) => setSite(parseCivitaiSite(v))}
            labelledBy="civitai-site-label"
          />
        </Row>
        <Row
          id="find-models-label"
          label="Look for new models"
          help={HELP.findNewModels}
          helpNote={HELP_NOTES.findNewModels}
        >
          <Toggle checked={findNewModels} onChange={setFindNewModels} labelledBy="find-models-label" />
        </Row>
      </Group>
    </Page>
  );
}
