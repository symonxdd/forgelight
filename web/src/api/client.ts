import type { components, paths } from "./forge-schema";

export type Schemas = components["schemas"];

type JsonResponse<Operation> = Operation extends {
  responses: { 200: { content: { "application/json": infer Body } } };
}
  ? Body
  : never;

type GetPath = { [P in keyof paths]: paths[P] extends { get: object } ? P : never }[keyof paths];
export type GetResponse<P extends GetPath> = JsonResponse<paths[P]["get"]>;

export class ForgeError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ForgeError";
  }
}

type PostPath = { [P in keyof paths]: paths[P] extends { post: object } ? P : never }[keyof paths];
export type PostResponse<P extends PostPath> = JsonResponse<paths[P]["post"]>;

/** Forge replies to failures with JSON like {"error": "...", "message": "..."}; surface the message. */
async function errorFrom(response: Response, path: string): Promise<ForgeError> {
  let message = `${path} returned ${response.status}`;
  try {
    const body = (await response.json()) as { message?: string; detail?: unknown; error?: string };
    message = body.message || (typeof body.detail === "string" ? body.detail : "") || body.error || message;
  } catch {
    // not JSON; keep the generic message
  }
  return new ForgeError(response.status, message);
}

/** GET a Forge API route. Paths are relative: the interface is served from Forge's own address. */
export async function forgeGet<P extends GetPath>(path: P, signal?: AbortSignal): Promise<GetResponse<P>> {
  const response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw await errorFrom(response, path);
  return (await response.json()) as GetResponse<P>;
}

export async function forgePost<P extends PostPath>(path: P, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(path, {
    method: "POST",
    signal,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw await errorFrom(response, path);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as PostResponse<P>;
}
