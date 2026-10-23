import { HELP, HELP_NOTES } from "../../lib/help";
import { FONTS, fontStack, parseFont } from "../../lib/preferences";
import { usePreferences } from "../../stores/preferences";
import { SectionsPicker } from "../SectionsPicker";
import { Toggle } from "../Toggle";
import { Dropdown, Group, Page, Row } from "./parts";

/** The OLED switch, shown only in dark mode. Also in the gear menu. */
export function OledRow() {
  const theme = usePreferences((s) => s.theme);
  const oled = usePreferences((s) => s.oled);
  const setOled = usePreferences((s) => s.setOled);
  if (theme !== "dark") return null;
  return (
    <Row id="oled-label" label="OLED black" help={HELP.oled}>
      <Toggle checked={oled === true} onChange={setOled} labelledBy="oled-label" />
    </Row>
  );
}

export function AppearancePage() {
  const font = usePreferences((s) => s.font);
  const setFont = usePreferences((s) => s.setFont);
  const fontOptions = FONTS.map(({ id, label }) => ({ value: id, label, style: { fontFamily: fontStack(id) } }));

  return (
    <Page title="Appearance" intro="Light or dark is switched with the moon and sun button in the top bar.">
      <Group>
        <Row id="font-label" label="Font" help={HELP.font}>
          <Dropdown
            value={font}
            options={fontOptions}
            onChange={(v) => setFont(parseFont(v))}
            labelledBy="font-label"
          />
        </Row>
        <OledRow />
        <Row id="sections-label" label="Sections" help={HELP.panelSections} helpNote={HELP_NOTES.panelSections}>
          <SectionsPicker labelledBy="sections-label" />
        </Row>
      </Group>
    </Page>
  );
}
