import { Check, LoaderCircle, Monitor } from "lucide-react";
import { useCreateDesktopShortcut, useSetOpenOnStart, useStartup } from "../../api/forgelight";
import { HELP } from "../../lib/help";
import { Toggle } from "../Toggle";
import { Group, Page, Row } from "./parts";
import { wideButton } from "./styles";

/** How Forge starts: opening Forgelight on start, and the desktop shortcut. */
export function ForgePage() {
  const startup = useStartup();
  const setOpenOnStart = useSetOpenOnStart();
  const createShortcut = useCreateDesktopShortcut();
  const state = startup.data;
  const error = setOpenOnStart.error ?? createShortcut.error;

  return (
    <Page title="Forge" intro="Open classic Forge and Stop Forge are in the gear menu.">
      <Group title="Starting Forge">
        <Row id="open-on-start-label" label="Open Forgelight on start" help={HELP.openOnStart}>
          <Toggle
            checked={state?.openOnStart ?? false}
            onChange={(enabled) => setOpenOnStart.mutate(enabled)}
            disabled={!state}
            labelledBy="open-on-start-label"
          />
        </Row>
        <Row id="shortcut-label" label="Desktop shortcut" help={HELP.desktopShortcut}>
          <button
            type="button"
            onClick={() => createShortcut.mutate()}
            disabled={!state || createShortcut.isPending}
            aria-describedby="shortcut-label"
            className={wideButton}
          >
            {createShortcut.isPending ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            ) : state?.desktopShortcut ? (
              <Check className="size-3.5 text-good" aria-hidden />
            ) : (
              <Monitor className="size-3.5" aria-hidden />
            )}
            {state?.desktopShortcut ? "Recreate" : "Create"}
          </button>
        </Row>
      </Group>
      {error && <p className="px-1 text-[12.5px] text-bad">{error.message}</p>}
    </Page>
  );
}
