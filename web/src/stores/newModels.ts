import { create } from "zustand";
import { forgePost } from "../api/client";
import { moveModel, NEW_MODELS_KEY, setModelHidden, type FoundModel, type MovedModel } from "../api/newModels";
import { queryClient } from "../api/queryClient";
import { useSession } from "./session";

export type MoveState =
  | { status: "waiting"; found: FoundModel }
  | { status: "moving"; found: FoundModel }
  | { status: "moved"; found: FoundModel; moved: MovedModel }
  | { status: "error"; found: FoundModel; message: string };

interface NewModelsState {
  /** Files put off with "Not now". Kept only until the page is opened again. */
  snoozed: string[];
  /** Moves started from the strip or a list, by file id, until their result is closed. */
  moves: Record<string, MoveState>;
  snooze: (ids: readonly string[]) => void;
}

export const useNewModels = create<NewModelsState>((set) => ({
  snoozed: [],
  moves: {},
  snooze: (ids) => set((s) => ({ snoozed: [...s.snoozed, ...ids] })),
}));

function setMove(id: string, move: MoveState): void {
  useNewModels.setState((s) => ({ moves: { ...s.moves, [id]: move } }));
}

/**
 * Moves a found file into Forge, then has Forge read its folder again so the model shows
 * up in the lists. While an image is being made, the move waits for it to finish.
 */
export async function startMove(found: FoundModel): Promise<void> {
  if (useSession.getState().job.status === "running") return setMove(found.id, { status: "waiting", found });
  setMove(found.id, { status: "moving", found });
  try {
    const moved = await moveModel(found);
    await forgePost(moved.kind === "checkpoint" ? "/sdapi/v1/refresh-checkpoints" : "/sdapi/v1/refresh-loras");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sd-models"] }),
      queryClient.invalidateQueries({ queryKey: ["forgelight-models"] }),
      queryClient.invalidateQueries({ queryKey: NEW_MODELS_KEY }),
    ]);
    setMove(found.id, { status: "moved", found, moved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The file couldn't be moved.";
    setMove(found.id, { status: "error", found, message });
    void queryClient.invalidateQueries({ queryKey: NEW_MODELS_KEY });
  }
}

export async function hideModel(found: FoundModel, hidden: boolean): Promise<void> {
  await setModelHidden(found, hidden);
  await queryClient.invalidateQueries({ queryKey: NEW_MODELS_KEY });
}

// Moves that waited for a generation start once it is over.
useSession.subscribe((state, previous) => {
  if (previous.job.status !== "running" || state.job.status === "running") return;
  for (const move of Object.values(useNewModels.getState().moves)) {
    if (move.status === "waiting") void startMove(move.found);
  }
});
