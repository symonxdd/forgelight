import { useId, type ReactNode } from "react";
import type { GuideDiagramId } from "../../lib/guide";

// docs/private-mode/*.svg draw the same diagrams for GitHub; a change here belongs there too.

type Kind = "plain" | "key" | "lock";

const BOX: Record<Kind, string> = {
  plain: "fill-surface stroke-line-strong",
  key: "fill-accent/10 stroke-accent",
  lock: "fill-raised stroke-line-strong",
};

function Zone({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={14} className="fill-canvas stroke-line-strong" strokeDasharray="5 5" />
      <text x={x + 16} y={y + 24} className="fill-muted text-[12px] font-medium">
        {label}
      </text>
    </>
  );
}

interface BoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines: string[];
  kind?: Kind;
}

function Box({ x, y, w, h, title, lines, kind = "plain" }: BoxProps) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={10} className={BOX[kind]} />
      <text x={x + 14} y={y + 25} className="fill-fg-strong text-[13.5px] font-semibold">
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={line} x={x + 14} y={y + 46 + i * 18} className="fill-muted text-[11.5px]">
          {line}
        </text>
      ))}
    </>
  );
}

/** Arrows: gray for images and files, dashed accent for keys. */
function Edge({ d, markers, keyPath = false }: { d: string; markers: string; keyPath?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      strokeWidth={1.5}
      className={keyPath ? "stroke-accent" : "stroke-faint"}
      strokeDasharray={keyPath ? "4 3" : undefined}
      markerEnd={`url(#${markers}-${keyPath ? "key" : "plain"})`}
    />
  );
}

function Frame({
  height,
  label,
  markers,
  children,
}: {
  height: number;
  label: string;
  markers: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface p-2">
      <svg viewBox={`0 0 760 ${height}`} role="img" aria-label={label} className="block h-auto w-full min-w-150">
        <defs>
          {(["plain", "key"] as const).map((kind) => (
            <marker
              key={kind}
              id={`${markers}-${kind}`}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className={kind === "key" ? "fill-accent" : "fill-faint"} />
            </marker>
          ))}
        </defs>
        {children}
      </svg>
    </div>
  );
}

function Saving({ markers }: { markers: string }) {
  return (
    <Frame
      height={236}
      markers={markers}
      label="Forge makes the image in memory, Forgelight encrypts it with a random key K, locks K with the public key, and only the encrypted files reach the disk."
    >
      <Zone x={8} y={8} w={524} h={220} label="In memory" />
      <Zone x={548} y={8} w={204} h={220} label="On disk" />
      <Box x={24} y={52} w={148} h={62} title="Forge" lines={["told not to save"]} />
      <Box x={200} y={52} w={148} h={62} title="New image" lines={["never written as a file"]} />
      <Box x={376} y={52} w={140} h={62} title="Encrypt" lines={["AES-256-GCM with K"]} />
      <Box x={200} y={150} w={148} h={62} title="Random key K" lines={["new for every image"]} kind="key" />
      <Box x={376} y={150} w={140} h={62} title="Lock K" lines={["with the public key"]} kind="key" />
      <Box
        x={564}
        y={52}
        w={172}
        h={160}
        title="Vault files"
        lines={["encrypted image", "encrypted settings", "and thumbnail", "locked K", "random names"]}
        kind="lock"
      />
      <Edge d="M172 83 H196" markers={markers} />
      <Edge d="M348 83 H372" markers={markers} />
      <Edge d="M516 83 H560" markers={markers} />
      <Edge d="M300 150 V132 H430 V118" markers={markers} keyPath />
      <Edge d="M348 181 H372" markers={markers} keyPath />
      <Edge d="M516 181 H560" markers={markers} keyPath />
    </Frame>
  );
}

function Unlocking({ markers }: { markers: string }) {
  const ways = [
    { title: "Password", note: "required, set up first", via: "scrypt", how: "slow on purpose" },
    { title: "PIN", note: "optional, this computer", via: "TPM 2.0 chip", how: "pauses after wrong PINs" },
    { title: "Recovery key", note: "shown once at setup", via: "HKDF", how: "for a long random code" },
  ];
  return (
    <Frame
      height={300}
      markers={markers}
      label="A password through scrypt, a PIN through the TPM chip, or a recovery key through HKDF each opens its own key slot, and any slot gives back the private key, which stays in memory."
    >
      <Zone x={404} y={8} w={168} h={284} label="On disk" />
      <Zone x={588} y={8} w={164} h={284} label="In memory" />
      {ways.map((way, i) => {
        const y = 48 + i * 80;
        return (
          <g key={way.title}>
            <Box x={16} y={y} w={150} h={58} title={way.title} lines={[way.note]} />
            <Box x={200} y={y} w={176} h={58} title={way.via} lines={[way.how]} />
            <Box x={420} y={y} w={136} h={58} title={`Slot ${i + 1}`} lines={["private key, locked"]} kind="lock" />
            <Edge d={`M166 ${y + 29} H196`} markers={markers} />
            <Edge d={`M376 ${y + 29} H416`} markers={markers} />
          </g>
        );
      })}
      <Box
        x={604}
        y={106}
        w={134}
        h={102}
        title="Private key"
        lines={["until Lock, private", "mode off, or Forge", "stops"]}
        kind="key"
      />
      <Edge d="M556 77 H580 V136 H600" markers={markers} keyPath />
      <Edge d="M556 157 H600" markers={markers} keyPath />
      <Edge d="M556 237 H580 V178 H600" markers={markers} keyPath />
    </Frame>
  );
}

function Viewing({ markers }: { markers: string }) {
  return (
    <Frame
      height={140}
      markers={markers}
      label="The vault file is read from disk, its key K is unlocked with the private key, the image is decrypted and shown in the browser from memory."
    >
      <Zone x={8} y={8} w={176} h={124} label="On disk" />
      <Zone x={200} y={8} w={552} h={124} label="In memory" />
      <Box x={24} y={48} w={144} h={62} title="Vault file" lines={["random name"]} kind="lock" />
      <Box x={216} y={48} w={160} h={62} title="Unlock K" lines={["with the private key"]} kind="key" />
      <Box x={404} y={48} w={148} h={62} title="Decrypt" lines={["refuses changed files"]} />
      <Box x={580} y={48} w={156} h={62} title="Browser" lines={["shown, never cached"]} />
      <Edge d="M168 79 H212" markers={markers} />
      <Edge d="M376 79 H400" markers={markers} />
      <Edge d="M552 79 H576" markers={markers} />
    </Frame>
  );
}

const DIAGRAMS: Record<GuideDiagramId, (props: { markers: string }) => ReactNode> = {
  "private-saving": Saving,
  "private-unlocking": Unlocking,
  "private-viewing": Viewing,
};

/** A diagram drawn with the theme's colors, scrolling sideways when the column is narrow. */
export function GuideDiagram({ id }: { id: GuideDiagramId }) {
  // Arrowhead ids must be unique: the same topic can be open in the guide and the side panel.
  const markers = useId().replace(/:/g, "");
  const Diagram = DIAGRAMS[id];
  return <Diagram markers={markers} />;
}
