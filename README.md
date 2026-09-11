# working-contract

**Working rules, injected into every Claude Code session. Two files do the work.**

Not a style guide and not a prompt. The rules arrive as `SessionStart` output, so their arrival is
observable and their cost is printed.

| File | Bytes | What it is |
|---|---|---|
| [`plugins/working-contract/RULES.md`](plugins/working-contract/RULES.md) | 4,406 | The rules — no reasoning, no checks |
| [`plugins/working-contract/hooks/wc.mjs`](plugins/working-contract/hooks/wc.mjs) | 7,929 | The only code. One file on three hook events |

## What it does to your session

| When | What happens | Can it stop you? |
|---|---|---|
| `SessionStart` | prints the rules, the session name, the live items, the gauge, the start-mode card | no |
| `UserPromptSubmit` | prints a three-row budget gauge — 5-hour, context, weekly | no |
| `Stop` | refuses a turn that ends without a card while a question is `OPEN` | **yes — the only one** |

Everything else is stated and unenforced. The hook is wrapped in one `try`/`catch`: any failure
exits 0 and prints what went dark, so a broken hook never blocks a session.

## Install

In a repository's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "working-contract": { "source": { "source": "github", "repo": "Pyure-ai/working-contract" } }
  },
  "enabledPlugins": { "working-contract@working-contract": true }
}
```

Then once per machine:

```bash
claude plugin install working-contract@working-contract
```

## Cloud sessions need one more step

⚠️ **The settings file alone is not enough, and the failure is silent.** A cloud session runs in a
fresh container that has never had `claude plugin install` run on it, and `once per machine` cannot
be followed on a machine you never see. Measured: a `claude.ai/code` session on a repository
carrying exactly the block above came up with **no rules at all** — `claude plugin list` printed
*No plugins installed* and `~/.claude/plugins/cache/` did not exist. The session behaved normally
otherwise, which is what makes it worth knowing about.

**This affects every cloud surface** — [Claude Code on the web](https://claude.ai/code), the Claude
mobile app, `claude --cloud`, Claude Tag and routines. Two of those run unattended.

**The fix is a setup script on the cloud environment.** At [claude.ai/code](https://claude.ai/code),
click the cloud icon in the row above the message box, hover your environment, click the gear, and
paste this into **Setup script**:

```bash
#!/bin/bash
# working-contract — install the plugin before Claude Code launches.
# MUST exit 0: a non-zero exit makes the session fail to start.
{
  set -x
  date -u
  claude plugin marketplace add Pyure-ai/working-contract --scope user || true
  claude plugin install working-contract@working-contract --scope user --yes || true
  claude plugin list || true
} > "$HOME/wc-setup.log" 2>&1
cat "$HOME/wc-setup.log"
exit 0
```

Three things about that script are not optional:

- **`marketplace add` comes first.** The setup script runs *before* Claude Code launches, so your
  repository's `extraKnownMarketplaces` has not seeded the marketplace registry yet and
  `working-contract` is not a known name at that moment. `claude plugin install` on its own fails.
- **`--scope user` is right here and wrong on a real machine.** The container is disposable. On a
  workstation, a user-scope install silently overrides every repository's project-scope declaration.
- **`exit 0`, and `|| true` throughout.** A setup script that exits non-zero makes the session fail
  to start — a broken script locks you out of the environment, not just out of the plugin.

**Per environment, not per repository.** Each environment you use needs the script once; every
repository opened in that environment then gets the plugin, and each repository still decides for
itself with `enabledPlugins`.

### Verifying it, and the one trap

Start a **new** session — resuming never re-runs a setup script — and ask it to `cat
$HOME/wc-setup.log`.

⚠️ **Compare the log's `date -u` against the session's own clock.** After the first run the
environment's filesystem is snapshotted and later sessions **skip the setup script**, serving the
old log from the snapshot. **A stale log is exactly what a correct, already-installed environment
produces**, and is indistinguishable from a fresh run by content alone. To prove which environment
ran, add an `echo` line naming it — and edit that name per environment rather than copying it.

⚠️ **The snapshot also pins the version.** Nothing in a cloud session runs `claude plugin update`.
The cache rebuilds when you change the setup script, change the environment's allowed hosts, or after
about seven days — so **editing the setup script is the lever for pulling a new version** into cloud
sessions.

## Updating

From inside a repository that uses it:

```bash
claude plugin update working-contract@working-contract --scope project
```

`--scope` defaults to `user`. A repository carrying its own `.claude/settings.json` resolves through
its `project` record, so only `--scope project` moves what that repository reads. A Claude Code
restart applies it.

## The record it expects

```
docs/log.md          settled decisions, one line each, append-only
docs/items/<id>.md   one file per question and per work item
```

Front matter: `id`, `kind` (`question` or `work`), `status`, `title`. A question is `OPEN`,
`DEFERRED` or `ANSWERED`; work is `UNSPECIFIED`, `BUILDABLE`, `BUILT` or `DROPPED`. Nothing else
holds state, and nothing is deleted to finish it — finishing changes `status`.

## Use it without the plugin

`RULES.md` is prose:

```bash
curl -fsSL https://raw.githubusercontent.com/Pyure-ai/working-contract/main/plugins/working-contract/RULES.md >> ~/.claude/CLAUDE.md
```

Or commit `RULES.md` into your own project and reference it from that project's `CLAUDE.md` — then it
arrives with the clone and updates with a pull, with no install, no restart and **no setup script in
any cloud environment**. You lose the gauge, the start-mode card and the turn-end refusal, which are
the only things the code provides.

**Adapt it by deleting any rule you will not follow.** Nothing checks the file, so an unfollowed rule
is pure cost.

## Requirements

Node.js 20.11 or newer. No dependencies, no network calls. Two of the gauge's three rows read a macOS
path written by the Claude desktop app; elsewhere — including every cloud session — those rows print
`not readable` and borrow no number rather than guessing.

MIT licensed.
