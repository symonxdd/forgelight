// Releases a new version of Forgelight: `npm run release` in web/.
//
// 1. Checks that the working copy is clean, on main and not behind GitHub.
// 2. Runs the same checks GitHub runs: types, lint, formatting, tests.
// 3. Asks for the release type (patch, minor or major) and shows the new version.
// 4. Shows the notes under "## Unreleased" in CHANGELOG.md and asks to go ahead.
// 5. Sets the version, dates the notes, commits "chore(build): release X.Y.Z",
//    tags the commit vX.Y.Z and pushes main and the tag.
//
// GitHub's release workflow takes it from the tag: it builds the interface and publishes
// the release branch and the Releases page. See docs/releasing.md.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { RELEASE_TYPES, nextVersion, releaseChangelog, unreleasedNotes } from "./releaseSteps.mjs";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(WEB, "..");
const CHANGELOG = join(ROOT, "CHANGELOG.md");

const read = (command) => execSync(command, { cwd: ROOT, encoding: "utf8" }).trim();
const run = (command, cwd = ROOT) => execSync(command, { cwd, stdio: "inherit" });

function stop(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function step(text) {
  console.log(`\n· ${text}`);
}

/** The GitHub address of this repository, from the origin remote. */
function repositoryUrl() {
  const remote = read("git remote get-url origin");
  return remote.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
// Ctrl+C at a question cancels the whole release, before anything has changed.
prompt.on("SIGINT", () => stop("Release cancelled. Nothing was changed."));
// Answers are read line by line, so typed and piped answers both work; no answer cancels.
const lines = prompt[Symbol.asyncIterator]();
async function ask(question) {
  process.stdout.write(question);
  const { value, done } = await lines.next();
  return done ? "" : value.trim();
}

step("Checking the working copy");
if (read("git rev-parse --abbrev-ref HEAD") !== "main") stop("Releases are made from main. Switch to main first.");
if (read("git status --porcelain")) stop("There are uncommitted changes. Commit or stash them first.");
run("git fetch --quiet origin");
if (Number(read("git rev-list --count HEAD..origin/main")) > 0) {
  stop("main is behind GitHub. Pull the latest changes first.");
}

const changelog = readFileSync(CHANGELOG, "utf8");
const notes = unreleasedNotes(changelog);
if (!notes) stop('CHANGELOG.md has no notes under "## Unreleased". Write the release notes there first.');

step("Running the checks (types, lint, formatting, tests)");
try {
  for (const script of ["typecheck", "lint", "format:check", "test"]) run(`npm run --silent ${script}`, WEB);
} catch {
  stop("A check failed, so nothing was released. Fix it and run the release again.");
}

const current = JSON.parse(readFileSync(join(WEB, "package.json"), "utf8")).version;
console.log(`\nCurrent version: ${current}\n`);
RELEASE_TYPES.forEach((type, index) => {
  console.log(`  ${index + 1}. ${type.padEnd(5)}  ${current} → ${nextVersion(current, type)}`);
});
const answer = await ask("\nRelease type (1, 2 or 3): ");
const type = RELEASE_TYPES[Number(answer) - 1];
if (!type) stop("Release cancelled. Nothing was changed.");
const version = nextVersion(current, type);
const tag = `v${version}`;
if (read(`git tag --list ${tag}`)) stop(`The tag ${tag} already exists.`);

console.log(`\nRelease notes for ${version}:\n\n${notes.replace(/^/gm, "  ")}\n`);
const confirm = await ask(`Release ${version}? This commits, tags and pushes. (y/N) `);
prompt.close();
if (confirm.toLowerCase() !== "y") stop("Release cancelled. Nothing was changed.");

step(`Setting the version to ${version}`);
run(`npm version ${version} --no-git-tag-version`, WEB);
// Today on this computer's clock, as YYYY-MM-DD (the Swedish locale writes dates that way).
const today = new Date().toLocaleDateString("sv-SE");
writeFileSync(CHANGELOG, releaseChangelog(changelog, version, today));

step(`Committing and tagging ${tag}`);
run("git add web/package.json web/package-lock.json CHANGELOG.md");
run(`git commit --quiet -m "chore(build): release ${version}"`);
run(`git tag -a ${tag} -m "Forgelight ${version}"`);

step("Pushing main and the tag to GitHub");
try {
  run("git push --quiet origin main");
  run(`git push --quiet origin ${tag}`);
} catch {
  stop(
    `The push failed; the release commit and tag ${tag} exist only on this computer.\n` +
      `Once the problem is solved, push them with:\n  git push origin main\n  git push origin ${tag}`,
  );
}

const repository = repositoryUrl();
console.log(`\nReleased ${tag}. GitHub is now building and publishing it:`);
console.log(`  Progress: ${repository}/actions`);
console.log(`  Release:  ${repository}/releases/tag/${tag}\n`);
