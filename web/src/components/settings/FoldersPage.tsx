import { FolderOpen } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { openFolder, useFolders, type FolderKey } from "../../api/folders";
import { Hint } from "../Hint";
import { Group, Page } from "./parts";
import { smallButton } from "./styles";

const MODELS: { key: FolderKey; label: string }[] = [
  { key: "checkpoints", label: "Checkpoints" },
  { key: "loras", label: "LoRAs" },
];
const IMAGES: { key: FolderKey; label: string }[] = [
  { key: "outputs", label: "Outputs" },
  { key: "upscaled", label: "Upscaled images" },
];
const FORGELIGHT: { key: FolderKey; label: string }[] = [{ key: "data", label: "Forgelight data" }];

/**
 * A folder's path. When it is too long for the row, its end stays visible, since that says
 * the most, and the whole path shows on hover. A path that fits has no tooltip.
 */
function FolderPath({ path }: { path: string | undefined }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element) setCut(element.scrollWidth > element.clientWidth);
  }, [path]);
  return (
    <Hint label={cut ? path : null}>
      <span ref={ref} tabIndex={cut ? 0 : -1} dir="rtl" className="truncate text-left text-[12px] text-faint">
        <span dir="ltr">{path ?? "…"}</span>
      </span>
    </Hint>
  );
}

function FolderRows({ items }: { items: { key: FolderKey; label: string }[] }) {
  const folders = useFolders().data;
  return items.map(({ key, label }) => {
    const folder = folders?.find((f) => f.key === key);
    return (
      <div key={key} className="flex min-h-14 items-center justify-between gap-3 py-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span id={`folder-${key}`} className="text-[13.5px] text-fg">
            {label}
          </span>
          <FolderPath path={folder?.path} />
        </div>
        <Hint label={folder && !folder.exists ? "Not created yet: appears once something is saved there" : null}>
          <span>
            <button
              type="button"
              onClick={() => void openFolder(key)}
              disabled={!folder?.exists}
              aria-describedby={`folder-${key}`}
              className={`${smallButton} flex items-center gap-1.5 disabled:opacity-40 disabled:hover:border-line disabled:hover:text-fg`}
            >
              <FolderOpen className="size-3.5" aria-hidden />
              Open
            </button>
          </span>
        </Hint>
      </div>
    );
  });
}

/** Where Forge and Forgelight keep their files, each with a way to open it. Opening only, never changing. */
export function FoldersPage() {
  return (
    <Page title="Folders" intro="Where Forge and Forgelight keep their files. Open shows a folder in File Explorer.">
      <Group title="Models">
        <FolderRows items={MODELS} />
      </Group>
      <Group title="Images">
        <FolderRows items={IMAGES} />
      </Group>
      <Group title="Forgelight">
        <FolderRows items={FORGELIGHT} />
      </Group>
    </Page>
  );
}
