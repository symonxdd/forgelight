// The parts of a release that change text, kept apart from the interactive script so
// they can be tested: the next version number, and the CHANGELOG edit.

export const RELEASE_TYPES = ["patch", "minor", "major"];

/** The next version for a release type, following semantic versioning. */
export function nextVersion(version, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`"${version}" is not a plain version number such as 1.2.3.`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  if (type === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown release type "${type}". Use patch, minor or major.`);
}

const UNRELEASED = /^## Unreleased[ \t]*$/m;

/** The notes waiting under "## Unreleased", or "" when there are none. */
export function unreleasedNotes(changelog) {
  const heading = UNRELEASED.exec(changelog);
  if (!heading) return "";
  const rest = changelog.slice(heading.index + heading[0].length);
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

/**
 * Turns "## Unreleased" into the version's own heading, with its date, and opens a new,
 * empty "## Unreleased" above it for the next version's notes.
 */
export function releaseChangelog(changelog, version, date) {
  if (!unreleasedNotes(changelog)) throw new Error('CHANGELOG.md has no notes under "## Unreleased".');
  return changelog.replace(UNRELEASED, `## Unreleased\n\n## ${version} (${date})`);
}
