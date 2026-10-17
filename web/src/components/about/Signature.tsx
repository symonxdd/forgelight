/**
 * The maker's signature, as in Symon's other apps: a slow violet to indigo sweep across
 * the text. The gradient repeats violet, indigo, violet, so one full tile per loop is
 * seamless. It stands still for anyone who has reduced motion switched on.
 */
export function Signature() {
  return (
    <p className="text-center text-[11px] tracking-wide">
      <span className="signature bg-clip-text font-medium text-transparent">A Symon Software Experience</span>
    </p>
  );
}
