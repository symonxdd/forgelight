import { useId } from "react";

const FLAME =
  "M12 2.8c1.8 3.7 6.3 6 6.3 11a6.3 6.3 0 0 1-12.6 0c0-2.7 1.4-4.2 2.7-5.8.3 2 1.3 3.1 2.6 3.4-.4-3.3.1-6 1-8.6Z";
const CORE = "M12 14.3c1.7 2.2 3.4 3.6 3.4 6a3.4 3.4 0 0 1-6.8 0c0-2.4 1.7-3.8 3.4-6Z";

/** The Forgelight mark (a flame with an open core), same as assets/forgelight-mark.svg. */
export function LogoMark({ className = "" }: { className?: string }) {
  const maskId = `core-${useId()}`;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
          <rect x="-2" y="-2" width="28" height="28" fill="#fff" />
          <path fill="#000" d={CORE} />
        </mask>
      </defs>
      <g transform="translate(0 .55)">
        <path mask={`url(#${maskId})`} d={FLAME} />
      </g>
    </svg>
  );
}
