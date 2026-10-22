import { useQuery } from "@tanstack/react-query";
import { ForgeError } from "./client";
import { request } from "./forgelight";
import { queryClient } from "./queryClient";

/** Private mode as the extension holds it, so every tab and every reload agree. */
export interface PrivateStatus {
  /** A vault with a password exists. */
  setUp: boolean;
  /** New images go into the vault. */
  on: boolean;
  /** The private key is in memory, so private images can be shown. */
  unlocked: boolean;
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

export async function setPrivateOn(on: boolean): Promise<void> {
  queryClient.setQueryData(PRIVATE_KEY, await request<PrivateStatus>("private/mode", { on }));
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
