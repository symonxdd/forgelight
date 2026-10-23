import { FolderOpen } from "lucide-react";
import { openFolder, type FolderKey } from "../api/folders";
import { Hint } from "./Hint";

/** A small folder icon button beside a list's reload button, opening that list's folder in File Explorer. */
export function FolderButton({
  folder,
  label,
  className = "",
}: {
  folder: FolderKey;
  label: string;
  className?: string;
}) {
  return (
    <Hint label={label}>
      <button
        type="button"
        onClick={() => void openFolder(folder)}
        aria-label={label}
        className={`grid shrink-0 place-items-center rounded-md text-faint hover:bg-raised hover:text-fg-strong ${className}`}
      >
        <FolderOpen className="size-3.5" aria-hidden />
      </button>
    </Hint>
  );
}
