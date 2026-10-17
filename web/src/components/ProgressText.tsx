import { HELP, HELP_NOTES } from "../lib/help";
import { TermTip } from "./TermTip";

const TERM = "checkpoint";

/** A progress label, with "checkpoint" explained on hover while one loads. */
export function ProgressText({ label }: { label: string }) {
  const at = label.indexOf(TERM);
  if (at === -1) return <>{label}</>;
  return (
    <>
      {label.slice(0, at)}
      <TermTip text={HELP.checkpoint} note={HELP_NOTES.checkpoint}>
        {TERM}
      </TermTip>
      {label.slice(at + TERM.length)}
    </>
  );
}
