// Generates src/api/forge-schema.d.ts from a running Forge's /openapi.json.
// Keeps only Forge's API routes and strips defaults that contain local file
// paths, so the committed types never carry details of one machine's install.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FORGE = process.env.FORGE_URL ?? "http://127.0.0.1:7860";
const KEEP_PATH = /^\/(sdapi\/v1\/|internal\/(progress|ping|pending-tasks)$)/;
const LOCAL_PATH = /[A-Za-z]:[\\/]|(^|")\/(home|Users)\//;

function stripLocalDefaults(node) {
  if (Array.isArray(node)) return node.forEach(stripLocalDefaults);
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "default" && LOCAL_PATH.test(JSON.stringify(value))) delete node[key];
    else stripLocalDefaults(value);
  }
}

const response = await fetch(`${FORGE}/openapi.json`);
if (!response.ok) throw new Error(`Forge returned ${response.status}. Is it running with --api?`);
const schema = await response.json();

schema.paths = Object.fromEntries(Object.entries(schema.paths).filter(([path]) => KEEP_PATH.test(path)));
stripLocalDefaults(schema);

const dir = mkdtempSync(join(tmpdir(), "forgelight-api-"));
const input = join(dir, "openapi.json");
writeFileSync(input, JSON.stringify(schema));
try {
  const run = (bin, args) => execFileSync(process.execPath, [bin, ...args], { stdio: "inherit" });
  run("node_modules/openapi-typescript/bin/cli.js", [input, "-o", "src/api/forge-schema.d.ts"]);
  run("node_modules/prettier/bin/prettier.cjs", ["--write", "src/api/forge-schema.d.ts"]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
