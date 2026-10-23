import { useSetAutoCheck, useUpdates } from "../../api/updates";
import { HELP } from "../../lib/help";
import { Toggle } from "../Toggle";
import { UpdateStatus } from "../updates/UpdateStatus";
import { Group, Page, Row } from "./parts";

/** The version check: its state with Check now, and the daily check switch. */
export function UpdatesPage({ onOpenUpdate }: { onOpenUpdate: () => void }) {
  const updates = useUpdates();
  const setAuto = useSetAutoCheck();
  const state = updates.data;
  return (
    <Page
      title="Updates"
      intro={
        state?.kind === "developer"
          ? `This is Forgelight ${__APP_VERSION__}.`
          : `This is Forgelight ${__APP_VERSION__}. Nothing is downloaded until Update is clicked.`
      }
    >
      <UpdateStatus onOpenUpdate={onOpenUpdate} />
      {/* A developer copy is never updated; UpdateStatus says so. */}
      {state?.kind !== "developer" && (
        <Group>
          <Row id="update-check-label" label="Check daily" help={HELP.updateCheck}>
            <Toggle
              checked={state?.auto ?? false}
              onChange={(enabled) => setAuto.mutate({ enabled })}
              disabled={!state || setAuto.isPending}
              labelledBy="update-check-label"
            />
          </Row>
        </Group>
      )}
    </Page>
  );
}
