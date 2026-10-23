import { openDriveSettings, setStartPrivate, useDriveEncryption, usePrivateStatus } from "../../api/private";
import { HELP, HELP_NOTES } from "../../lib/help";
import { Hint } from "../Hint";
import { Toggle } from "../Toggle";
import { Group, Page, Row } from "./parts";
import { smallButton } from "./styles";

/** The dialogs the page's buttons open; they live beside the settings window. */
export interface PrivacyActions {
  onPin: () => void;
  onRemovePin: () => void;
  onPassword: () => void;
  onRecoveryKey: () => void;
  onThumbnails: () => void;
}

/** Shows whether BitLocker protects the system drive, with a way to its Windows settings. */
function DriveEncryptionRow() {
  const drive = useDriveEncryption(true);
  const state = drive.data;
  return (
    <Row id="drive-label" label="Drive encryption" help={HELP.driveEncryption} helpNote={HELP_NOTES.driveEncryption}>
      <div className="flex items-center gap-2">
        <Hint label={state ? `Windows reports: ${state.state}` : null}>
          <span
            tabIndex={state ? 0 : -1}
            className={`text-[12.5px] whitespace-nowrap ${state?.protected ? "text-good" : "text-muted"}`}
          >
            {state ? (state.protected ? state.state : state.state === "Off" ? "Off" : "Not active") : "…"}
          </span>
        </Hint>
        <button type="button" onClick={() => void openDriveSettings()} className={smallButton}>
          Open
        </button>
      </div>
    </Row>
  );
}

/**
 * Private mode's settings, plus two that help keep images private on this computer either
 * way: clearing Windows' thumbnails, and the state of drive encryption.
 */
export function PrivacyPage({ onPin, onRemovePin, onPassword, onRecoveryKey, onThumbnails }: PrivacyActions) {
  const status = usePrivateStatus().data;
  const setUp = status?.setUp ?? false;
  return (
    <Page title="Privacy">
      <Group title="Private mode">
        {setUp ? (
          <>
            <Row id="start-private-label" label="Start in private mode" help={HELP.startPrivate}>
              <Toggle
                checked={status?.startPrivate ?? false}
                onChange={(on) => void setStartPrivate(on)}
                labelledBy="start-private-label"
              />
            </Row>
            {status?.pinAvailable && (
              <Row id="pin-label" label="PIN" help={HELP.pin} helpNote={HELP_NOTES.pin}>
                <div className="flex items-center gap-1.5">
                  {status.pin && (
                    <button type="button" onClick={onRemovePin} className={smallButton}>
                      Remove
                    </button>
                  )}
                  <button type="button" onClick={onPin} className={smallButton}>
                    {status.pin ? "Change" : "Add PIN"}
                  </button>
                </div>
              </Row>
            )}
            <Row id="password-label" label="Password" help={HELP.privatePassword}>
              <button type="button" onClick={onPassword} className={smallButton}>
                Change
              </button>
            </Row>
            <Row id="recovery-label" label="Recovery key" help={HELP.recoveryKey}>
              <button type="button" onClick={onRecoveryKey} className={smallButton}>
                New key
              </button>
            </Row>
          </>
        ) : (
          <p className="py-3 text-[13px] leading-relaxed text-muted">
            Not set up yet. The Private switch beside the image count, next to Generate, sets it up.
          </p>
        )}
      </Group>
      <Group title="Windows">
        <Row
          id="thumbnails-label"
          label="Windows thumbnails"
          help={HELP.windowsThumbnails}
          helpNote={HELP_NOTES.windowsThumbnails}
        >
          <button type="button" onClick={onThumbnails} className={smallButton}>
            Clear
          </button>
        </Row>
        <DriveEncryptionRow />
      </Group>
    </Page>
  );
}
