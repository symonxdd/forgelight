import { useQuery, type InfiniteData } from "@tanstack/react-query";
import { useSession } from "../stores/session";
import { ForgeError } from "./client";
import { request } from "./forgelight";
import type { LibraryPage } from "./library";
import { queryClient } from "./queryClient";

/** Private mode as the extension holds it, so every tab and every reload agree. */
export interface PrivateStatus {
  /** A vault with a password exists. */
  setUp: boolean;
  /** New images go into the vault. */
  on: boolean;
  /** The private key is in memory, so private images can be shown. */
  unlocked: boolean;
  /** A PIN is set up. */
  pin: boolean;
  /** This computer's security chip can hold a PIN. */
  pinAvailable: boolean;
  /** Forge starts with private mode on. */
  startPrivate: boolean;
}

export interface DriveEncryption {
  drive: string;
  /** Windows' own label, such as "On" or "Waiting for activation". */
  state: string;
  protected: boolean;
}

export const PRIVATE_KEY = ["private"];

const fetchStatus = () => request<PrivateStatus>("private");

export function usePrivateStatus() {
  return useQuery({ queryKey: PRIVATE_KEY, queryFn: fetchStatus, staleTime: 5000 });
}

/** Asks the extension right before a generation, so the image goes where the switch says. */
export async function privateModeOn(): Promise<boolean> {
  try {
    return (await queryClient.fetchQuery({ queryKey: PRIVATE_KEY, queryFn: fetchStatus, staleTime: 0 })).on;
  } catch {
    return false;
  }
}

/** Switching to public also locks the vault, so private images leave the screen too. */
export async function setPrivateOn(on: boolean): Promise<void> {
  queryClient.setQueryData(PRIVATE_KEY, await request<PrivateStatus>("private/mode", { on }));
  if (!on) await forgetPrivateImages();
}

/** One way in: the password, the PIN or the recovery key. */
export type PrivateSecret = { password: string } | { recovery: string } | { pin: string };

/** Shows private images: with the password, the PIN or the recovery key. */
export async function unlockPrivate(secret: PrivateSecret): Promise<void> {
  queryClient.setQueryData(PRIVATE_KEY, await request<PrivateStatus>("private/unlock", secret));
  await queryClient.invalidateQueries({ queryKey: ["library"] });
}

/** Hides private images again, until the PIN, the password or the recovery key is entered. */
export async function lockPrivate(): Promise<void> {
  queryClient.setQueryData(PRIVATE_KEY, await request<PrivateStatus>("private/lock", {}));
  await forgetPrivateImages();
  useSession.getState().setNotice({ tone: "info", title: "Locked", text: "Private images are locked." });
}

/**
 * After locking: private images leave the Library and the Session strip at once, before
 * the Library has reloaded, and their pictures in memory are let go.
 */
async function forgetPrivateImages(): Promise<void> {
  queryClient.setQueriesData<InfiniteData<LibraryPage>>({ queryKey: ["library"] }, (data) =>
    data
      ? { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.filter((i) => !i.private) })) }
      : data,
  );
  useSession.setState((state) => {
    const kept = state.images.filter((image) => !image.private);
    for (const image of state.images) if (image.private) URL.revokeObjectURL(image.url);
    const selectedId = kept.some((image) => image.id === state.selectedId) ? state.selectedId : (kept[0]?.id ?? null);
    return { images: kept, selectedId };
  });
  await queryClient.invalidateQueries({ queryKey: ["library"] });
}

// The PIN, password and recovery key changes below need `confirm` while private images are
// locked. It is checked for that one change only: private images stay locked.

/** Adds a PIN or replaces it. */
export async function setPin(pin: string, confirm?: PrivateSecret): Promise<void> {
  queryClient.setQueryData(PRIVATE_KEY, await request<PrivateStatus>("private/pin", { pin, confirm }));
}

export async function removePin(confirm?: PrivateSecret): Promise<void> {
  queryClient.setQueryData(PRIVATE_KEY, await request<PrivateStatus>("private/pin", { pin: null, confirm }));
}

export async function setStartPrivate(on: boolean): Promise<void> {
  queryClient.setQueryData(PRIVATE_KEY, await request<PrivateStatus>("private/start", { on }));
}

/** Sets a new password; with the recovery key as `confirm`, a forgotten one too. Images are not encrypted again. */
export async function changePassword(next: string, confirm?: PrivateSecret): Promise<void> {
  queryClient.setQueryData(PRIVATE_KEY, await request<PrivateStatus>("private/password", { new: next, confirm }));
}

/** A fresh recovery key, shown once; the old one stops working. */
export async function newRecoveryKey(confirm?: PrivateSecret): Promise<string> {
  return (await request<{ recoveryCode: string }>("private/recovery", { confirm })).recoveryCode;
}

/** Deletes Windows' thumbnail cache; files File Explorer is using right then are skipped. */
export function clearThumbnails(): Promise<{ cleared: number; skipped: number; bytes: number }> {
  return request("private/thumbnails", {});
}

/** BitLocker's state for the system drive, checked at most once a minute. */
export function useDriveEncryption(enabled: boolean) {
  return useQuery({
    queryKey: ["private", "drive"],
    queryFn: () => request<DriveEncryption>("private/drive"),
    enabled,
    staleTime: 60_000,
  });
}

export function openDriveSettings(): Promise<unknown> {
  return request("private/drive/open", {});
}

/** Creates the vault; the recovery code comes back once and is never stored. */
export async function setUpPrivate(password: string): Promise<string> {
  const { recoveryCode, ...status } = await request<PrivateStatus & { recoveryCode: string }>("private/setup", {
    password,
  });
  queryClient.setQueryData(PRIVATE_KEY, status);
  return recoveryCode;
}

export type PrivateKind = "txt2img" | "img2img";

interface PrivateReply {
  images: string[];
  info: string;
}

const RESULT_POLL_MS = 500;

/**
 * Waits for a private generation's reply, which the extension keeps until it is fetched.
 * It has the shape of Forge's own reply, so the page shows it the same way.
 */
export async function waitForPrivateResult(taskId: string): Promise<PrivateReply> {
  for (;;) {
    const job = await request<{ status: string; images?: string[]; info?: string; message?: string }>(
      `private/result?task=${encodeURIComponent(taskId)}`,
    );
    if (job.status === "done") return { images: job.images ?? [], info: job.info ?? "" };
    if (job.status === "error") throw new ForgeError(500, job.message ?? "The private generation failed.");
    if (job.status === "unknown") {
      throw new ForgeError(404, "The private generation was not found. Forge may have restarted.");
    }
    await new Promise((resolve) => setTimeout(resolve, RESULT_POLL_MS));
  }
}

/** Has the extension pass a generation on to Forge without saving, and encrypt its images. */
export async function privateGenerate(kind: PrivateKind, body: { force_task_id: string }): Promise<PrivateReply> {
  await request("private/generate", { kind, request: body });
  return waitForPrivateResult(body.force_task_id);
}

/** Encrypts one finished image into the vault, such as an upscaled one. */
export function addPrivateImage(image: string, infotext: string): Promise<{ id: string }> {
  return request("private/add", { image, infotext });
}
