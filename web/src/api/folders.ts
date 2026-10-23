import { useQuery } from "@tanstack/react-query";
import { useSession } from "../stores/session";
import { request } from "./forgelight";

export type FolderKey = "checkpoints" | "loras" | "outputs" | "upscaled" | "data";

/** One folder Settings lists, as Forge's own settings name it. */
export interface Folder {
  key: FolderKey;
  path: string;
  /** False until Forge or Forgelight first saves something there. */
  exists: boolean;
}

export function useFolders(enabled = true) {
  return useQuery({ queryKey: ["folders"], queryFn: () => request<Folder[]>("folders"), enabled, staleTime: 10_000 });
}

/** Opens a folder in File Explorer; a failure shows as a notice, since there's nothing else to undo. */
export async function openFolder(key: FolderKey): Promise<void> {
  try {
    await request("folders/open", { key });
  } catch (error) {
    useSession.getState().setNotice({
      tone: "warning",
      text: error instanceof Error ? error.message : "The folder could not be opened.",
    });
  }
}
