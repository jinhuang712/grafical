# GITFLOW.md

Git conventions for this repository. The development loop and the definition of done are in [AGENTS.md](AGENTS.md).

## Tool

Use plain `git`. Do not use `kgf` or other company git tooling here. When the working directory is not the repository, use `git -C <repo-root>`.

## Identity

This is a personal, public repository. A company identity must never appear in commit metadata.

| Setting | Value |
|---|---|
| `user.name` | `jinhuang712` |
| `user.email` | `36698563+jinhuang712@users.noreply.github.com` |

Set both repo-locally, so the global identity stays untouched:

```sh
git -C <repo-root> config --local user.name jinhuang712
git -C <repo-root> config --local user.email "36698563+jinhuang712@users.noreply.github.com"
```

Run `git config user.email` before the first commit in a new clone. A commit with a company email address is a defect.

## Remote

`origin` is `https://github.com/jinhuang712/grafical`, a public repository. Pushing to `main` is the whole flow. There are no pull requests and no release branches yet.

## Branches

`main` is the trunk.

| Situation | Branch |
|---|---|
| A small, reversible change | Commit to `main` |
| An experiment that may be abandoned, such as a phase 0 spike | `spike/<slug>` |
| A larger feature or fix | `feat/<slug>` or `fix/<slug>` |

- Slugs are lowercase and hyphenated, such as `spike/gap-router`.
- Land a branch by rebasing onto `main`, then fast-forward and delete it. No merge commits.
- Never force-push `main`, and never rewrite a commit that is on the remote.

## Commit messages

```text
<type>(<scope>): <subject>
```

The scope is optional. Add `!` after the type or scope for a breaking change, and a `BREAKING CHANGE:` footer that says what callers must do differently.

| Type | Use for |
|---|---|
| `feat` | A new capability |
| `fix` | Correcting wrong behavior |
| `refactor` | The same behavior, a different shape |
| `perf` | The same behavior, faster |
| `test` | Tests and fixtures only |
| `docs` | Documentation only |
| `build` | Packaging, dependencies, toolchain |
| `ci` | CI configuration |
| `bench` | A benchmark run and its recorded results |
| `chore` | Anything else that deserves its own commit |

- The scope is the module or directory touched, in lowercase, such as `layout`, `router` or `cli`.
- The subject is lowercase except for names and identifiers, has no trailing period, and is at most 72 characters.
- The subject describes the effect, not the process: `keep layer order on node.remove`, not `fixed some layout stuff`.
- When the change implements a design decision, end the subject with its ID, such as `(D10)`.
- The body explains why. The diff already shows what.

## Attribution

No agent attribution: no `Co-Authored-By`, no `Generated with`, no session links. The identity above is the only author.

## What agents may do

- Commit and push a change to `main` once it is verified and the owner has agreed on its scope. While a design is still under discussion, do not commit.
- Stage only the files the task changed. Never use `git add -A` or `git add .` as a shortcut.
- Never force-push, never rewrite pushed history, and never discard uncommitted changes you did not make.
- Read `git status --short` and `git diff --staged` before every commit.

## Ignore rules

Source, documentation, fixtures and test snapshots are tracked. Dependencies, build output, render output and benchmark run output are not. The patterns live in `.gitignore`. Generated output is never committed, except snapshot files that tests compare against.
