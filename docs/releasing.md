# Releasing Forgelight

The `main` branch holds source code only; the built interface (`page/`) is never committed there. A new version reaches people only when a version tag such as `v1.2.0` is pushed. GitHub then builds the interface and publishes the release.

## Before a release

**The release notes** are written under `## Unreleased` at the top of [CHANGELOG.md](../CHANGELOG.md). They are what people read when deciding whether to update:

- Past tense, describing the result: "Added a fullscreen viewer".
- What changed for a person using Forgelight, never which file moved. Refactors, comment fixes and docs changes are left out.
- Calm, neutral prose, without "you", "I" or "we".
- Subsections `### 🆕 New`, `### 🐛 Fixed` and `### ✨ Improved`, in that order, only those with entries.
- The opening sentence of the headline item in bold, then a short explanation.

**The release type** follows [semantic versioning](https://semver.org):

| Type | Version | For |
|---|---|---|
| Patch | 1.2.**3** | Fixes only |
| Minor | 1.**3**.0 | New features; nothing people rely on changes |
| Major | **2**.0.0 | Something people rely on changes or goes away |

## Releasing

In the `web` folder:

```
npm run release
```

The script ([web/scripts/release.mjs](../web/scripts/release.mjs)):

1. Checks that the working copy is clean, on `main` and not behind GitHub, and that `CHANGELOG.md` has notes under `## Unreleased`.
2. Runs the same checks as GitHub: types, lint, formatting and tests.
3. Asks for the release type and shows the resulting version.
4. Shows the release notes and asks for a final go-ahead. Nothing has changed up to this point.
5. Sets the version in `web/package.json`, turns `## Unreleased` into `## 1.2.0 (date)` with a new empty `## Unreleased` above it, commits `chore(build): release 1.2.0`, tags the commit `v1.2.0` and pushes `main` and the tag.

## What GitHub does

Pushing the tag starts [.github/workflows/release.yml](../.github/workflows/release.yml):

1. Checks that the tag matches the version in `web/package.json`.
2. Runs the checks and builds the interface into `page/`.
3. Commits the ready-to-run copy to the `release` branch: `scripts/`, `forgelight_backend/`, `page/`, `assets/`, the README, CHANGELOG and license. No interface source code or docs.
4. Creates the GitHub release "Forgelight 1.2.0" with the version's CHANGELOG section and the same copy as `forgelight-1.2.0.zip`.

Progress shows under the repository's **Actions** tab, the result on the **Releases** page. Pushes to `main` without a tag only run the checks ([checks.yml](../.github/workflows/checks.yml)).

## Releasing by hand

Without the script, the same steps, from the repository root:

```
cd web
npm version 1.2.0 --no-git-tag-version
cd ..
# In CHANGELOG.md: rename "## Unreleased" to "## 1.2.0 (date)" and add a new "## Unreleased" above it.
git add web/package.json web/package-lock.json CHANGELOG.md
git commit -m "chore(build): release 1.2.0"
git tag -a v1.2.0 -m "Forgelight 1.2.0"
git push origin main
git push origin v1.2.0
```

## Installing a release

See [Installation](../README.md#installation) in the README: through Forge's *Install from URL* with the branch `release`, `git clone -b release`, or the ZIP from the Releases page.
