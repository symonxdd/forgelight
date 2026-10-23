/**
 * A label that can turn bold without getting wider: an invisible bold copy holds its width,
 * so switching between choices never nudges the ones beside it.
 */
export function SteadyLabel({ text, bold }: { text: string; bold: boolean }) {
  return (
    <span className="grid">
      <span className="invisible col-start-1 row-start-1 font-medium" aria-hidden>
        {text}
      </span>
      <span className={`col-start-1 row-start-1 text-center ${bold ? "font-medium" : "font-normal"}`}>{text}</span>
    </span>
  );
}
