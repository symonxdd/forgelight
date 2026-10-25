import { HELP, HELP_NOTES } from "../../lib/help";
import { FONTS, fontStack, parseFont, type ClockStyle, type DateOrder, type NumberStyle } from "../../lib/preferences";
import { windowsExamples } from "../../lib/region";
import { usePreferences } from "../../stores/preferences";
import { SectionsPicker } from "../SectionsPicker";
import { Toggle } from "../Toggle";
import { Dropdown, Group, Page, Row, Segmented } from "./parts";

const NUMBER_STYLES: { value: NumberStyle; label: string }[] = [
  { value: "windows", label: "Like Windows" },
  { value: "space", label: "1 234,5" },
  { value: "comma", label: "1.234,5" },
  { value: "dot", label: "1,234.5" },
];
const DATE_ORDERS: { value: DateOrder; label: string }[] = [
  { value: "windows", label: "Like Windows" },
  { value: "day", label: "15 Oct" },
  { value: "month", label: "Oct 15" },
];
const CLOCK_STYLES: { value: ClockStyle; label: string }[] = [
  { value: "windows", label: "Like Windows" },
  { value: "24", label: "15:31" },
  { value: "12", label: "3:31 PM" },
];

/** Separators, date order and clock: Windows' own format unless one is picked here. */
function NumbersAndDates() {
  const numberStyle = usePreferences((s) => s.numberStyle);
  const dateOrder = usePreferences((s) => s.dateOrder);
  const clockStyle = usePreferences((s) => s.clockStyle);
  const setNumberStyle = usePreferences((s) => s.setNumberStyle);
  const setDateOrder = usePreferences((s) => s.setDateOrder);
  const setClockStyle = usePreferences((s) => s.setClockStyle);
  // The same moment the buttons show, so the examples read alike.
  const windows = windowsExamples(new Date(new Date().getFullYear(), 9, 15, 15, 31));
  return (
    <div className="flex flex-col gap-2">
      <Group title="Numbers and dates" help={HELP.numbersAndDates}>
        <Row id="numbers-label" label="Numbers">
          <Segmented value={numberStyle} options={NUMBER_STYLES} onChange={setNumberStyle} labelledBy="numbers-label" />
        </Row>
        <Row id="dates-label" label="Dates">
          <Segmented value={dateOrder} options={DATE_ORDERS} onChange={setDateOrder} labelledBy="dates-label" />
        </Row>
        <Row id="clock-label" label="Clock">
          <Segmented value={clockStyle} options={CLOCK_STYLES} onChange={setClockStyle} labelledBy="clock-label" />
        </Row>
      </Group>
      <p className="px-1 text-[12.5px] text-muted">
        Like Windows gives {windows.number} · {windows.date} · {windows.time} on this computer.
      </p>
    </div>
  );
}

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
      <NumbersAndDates />
    </Page>
  );
}
