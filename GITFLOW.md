# GITFLOW.md

Version control conventions for this repository.

[AGENTS.md](AGENTS.md) owns the development loop and the definition of done. This file owns git: identity, branches, messages, and what the agent may do.

## Tool

Plain `git`. The rule keys on the remote, not the path: `kgf` governs repositories whose remote is `git.klook.io`, and this one is not among them. When the working directory is not the repository, use `git -C <repo-root>`.

## Identity

Commits here are personal work on a public GitHub repository. The company identity must never appear in commit metadata.

| Setting | Value |
|---|---|
| `user.name` | `jinhuang712` |
| `user.email` | `36698563+jinhuang712@users.noreply.github.com` |

Set it repo-locally so the global company identity stays untouched:

```bash
git -C <repo-root> config --local user.name jinhuang712
git -C <repo-root> config --local user.email "36698563+jinhuang712@users.noreply.github.com"
```

Check `git config user.email` before the first commit. A commit carrying `@klook.com` is a defect, not a preference.

## Branches

`main` is the trunk.

| Situation | Branch |
|---|---|
| Solo work, small and reversible | commit straight to `main` |
| Experimental, may be abandoned | `feat/<slug>` or `fix/<slug>` |
| Mechanical bulk change (`prettier`, dependency bump) | its own branch |

- Name branches `<type>/<slug>`, lowercase, hyphenated: `feat/layout-engine`, `fix/ir-determinism`. The type matches the commit type of the landing change.
- Land by rebase onto `main`, then delete the branch. No merge commits.
- Never force-push `main`. Never rewrite a commit that exists on the remote.

## Commit messages

```
<type>(<scope>)!: <subject>
```

The parenthesized scope and the `!` are both optional. The subject is required and is the only part that appears in `git log --oneline`.

### Type

| Type | Use for |
|---|---|
| `feat` | New capability |
| `fix` | Correcting wrong behavior |
| `refactor` | Same behavior, different shape |
| `perf` | Same behavior, faster |
| `test` | Tests and fixtures only |
| `docs` | Documentation only |
| `build` | Packaging, dependencies, toolchain config |
| `ci` | Pipeline configuration |
| `bench` | A benchmark run and its recorded results |
| `chore` | Anything else that still deserves its own commit |

### Scope

The module or directory touched, lowercase, one word preferred. Multiple scopes are comma-separated with no space: `fix(patch,inspect)`. Omit the scope when the change is genuinely repo-wide.

### Subject

- Lowercase, except proper nouns and identifiers.
- No trailing period. No `WIP`, no `trying to`, no `wip`.
- At most 72 characters.
- Describe the effect, not the process: `remove dead code`, not `removed some dead code`.
- Append a design-decision id in parentheses when the change implements one: `(D24)`.
- If the subject needs "and", it is two commits.

Examples from this author's repositories, both acceptable:

```
feat(parser): .pixel text envelope as a second spelling of the source (D25)
fix(system,windows): open_log_dir/open_db_path launch explorer on Windows
docs(goals): set the Sonnet tier as the model floor, record the tripped kill criterion
chore: remove dead code and unused dependencies
```

### Body

Explain why, not what — the diff already shows what changed. Wrap at 72 characters. Leave a blank line after the subject. A body is optional; a body that restates the subject is worse than no body.

### Breaking changes

Mark with `!` after the type or scope, and add a `BREAKING CHANGE:` footer naming what the caller must do differently. Example in the wild: `refactor(codex)!: ...`.

### Attribution

No agent attribution. No `Co-Authored-By`, no `Generated with`, no tool footers. The author identity is set above and nothing else belongs in the trailer block.

## What the agent does

- **Does not commit, amend, push, tag, branch, or stash unless asked.** A finished change is reported, not committed.
- **Stages only what it changed for the task.** Never `git add -A` or `git add .` as a shortcut.
- **Never rewrites history**: no `--amend` on a commit that exists on the remote, no rebase of `main`, no `--force` without an explicit request naming the branch.
- **Never discards work**: `checkout --`, `reset --hard`, `clean -fd`, and `stash drop` are off by default. Reverting user changes requires a request naming the path.
- **Reads its own diff** (`git status --short`, `git diff`) before reporting done.

## Ignore rules

Tracked: source, documentation, fixtures, and the expected outputs inside snapshot directories that are part of the contract.

Untracked: `node_modules/`, build output (`dist/`), render output (`examples/.out/`), and generated artifacts (`*.ir.json`, throwaway `*.png`).

Generated artifacts never enter the index. When an output is durable enough to be asserted against, it lives under a snapshot directory that is tracked on purpose.

## Remote

`origin` is `github.com/jinhuang712/grafical`, private. Pushing `main` is the whole flow: no pull requests, no release branching.

Tags and release automation stay out of scope until there is something to publish. This file gets a section for them then.
