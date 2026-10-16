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

/** GET a Forge API route. Paths are relative: the interface is served from Forge's own address. */
export async function forgeGet<P extends GetPath>(path: P, signal?: AbortSignal): Promise<GetResponse<P>> {
  const response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new ForgeError(response.status, `${path} returned ${response.status}`);
  return (await response.json()) as GetResponse<P>;
}
