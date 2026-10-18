# Femto variant — build & deployment report

Record of the "femto" effort: a stripped-down, expense-only Firefly Pico for flatmates to log
shared-household costs, made hard to misuse. Companion to [`../plans/femto.md`](../plans/femto.md).

## Goal

Give flatmates a Pico that can do exactly one thing — enter an expense — with everything else
removed or hidden. Constraint: smallest possible diff, so the branch stays easy to rebase on
upstream.

## What changed (7 commits, ~48 lines, 6 files)

Approach: **UI-hide only** (owner's choice) — hide/remove in the UI rather than build URL-proof
enforcement. Hidden routes/filters remain reachable by direct URL; acceptable for this audience.

1. `feat(femto): land on Add Expense as home page` — `pages/index.vue`
2. `feat(femto): remove Dashboard and Extras from navigation` — bottom toolbar + desktop sidebar
3. `feat(femto): expense-only entry (hide transaction type tabs)` — `[[id]].vue`
4. `feat(femto): hide assistant in expense entry` — `[[id]].vue`
5. `feat(femto): hide destination account field (keep default value)` — `[[id]].vue`
6. `feat(femto): hide PAT field in Settings > Setup` — `settings/setup.vue`
7. `feat(femto): always filter transactions list to default source account` — `list.vue`

### Key decisions / tradeoffs
- **Expense-only is enforced by the accounts, not the hidden tabs.** `transformToApi` derives the
  Firefly type from source+destination account types. So the saved type is always a withdrawal as
  long as the configured defaults are sane (see precondition).
- **Destination field hidden but value preserved** via the existing `getEmpty()` init from
  `profileStore.defaultAccountDestination`. No change to the save path.
- **List filter** wraps the default source account in an array (`{ account: [defaultAccountSource] }`)
  because the `account` filter maps over its value; this also sidesteps a latent single-object bug in
  the existing predefined-filter path.
- **Dead code left in place** (`assistantText`/`onAssistant`, a few unused imports) to keep the diff
  minimal; lint isn't wired into the build, so it doesn't break `nuxt build`.

### Precondition (per browser; Pico settings live in localStorage)
- Default **source** account = the shared account (a **liability** account in this deployment)
- Default **destination** account = an expense account

Upstream `dev` includes #272 ("stop dropping saved default accounts on new-transaction form load"),
which is why a liability source works without the form's account-fix logic nulling the destination.
The branch is rebased on `dev`, so that fix is in the base.

## Branch / PR
- Branch `femto` in `Nitschi/firefly-pico`, rebased onto upstream `dev`.
- PR #5 (`femto` → fork `dev`). Note: the two `ci(femto)` build-workflow commits also ride in this PR.

## Build (the interesting part)

The image bundles a Laravel backend + a Nuxt frontend that must be compiled (`nuxt build`) — you
can't drop source files into a running container and restart.

- **First attempt: build on the Pi — failed.** The arm64 Nuxt/Vite build exhausted the Pi's 3.7 GB
  RAM and thrashed in swap for ~1.5 h; sshd couldn't even emit a login banner (peak load ~238 on
  4 cores). Dropping the SSH client did **not** cancel the daemon-side BuildKit job. Once the box
  dipped enough to let me in, I killed the exact build PIDs and it recovered. Lesson: never run the
  full build on the Pi.
- **Second attempt: GitHub Actions — worked.** Added `.github/workflows/femto-build.yml` (on the
  `femto` branch) that builds on a native **`ubuntu-24.04-arm`** runner (~16 GB RAM, no QEMU),
  `docker save | gzip`s the image, and uploads it as an artifact. Triggers on push to `femto`.
- **Delivery (no registry):** downloaded the artifact on the dev PC and streamed it into the Pi's
  docker over SSH (`cat firefly-pico-femto.tar.gz | ssh pi 'docker load'`). 72 MB gzip → 234 MB image.

## Deployment

- Repo `Nitschi/wg-cash`, `~/homeserver/wg-cash/docker-compose.yml`, commit **`ba8ce89`** on `main`.
- `pico` service `image:` → `firefly-pico:femto`, plus `pull_policy: never` (local-only tag, no
  registry to pull from).
- `docker compose up -d pico` on the Pi (`pi@10.0.1.42`).
- Backup of the previous compose kept at `~/homeserver/wg-cash/docker-compose.yml.pre-femto`.

### Verification (passed)
- Container `Up`, `0 restarts`, state `running`.
- `/var/www/html/VERSION` == `femto`.
- Serves `HTTP 200` and `<title>Pico</title>` (checked via `127.0.0.1:80` and node `:3000`; busybox
  `wget` to `localhost` fails on IPv6 `::1` — a check quirk, not a service issue).
- Rest of the stack (firefly-app, db, importer, caddy) untouched and healthy.

## Rollback
Any one of:
- `cd ~/homeserver/wg-cash && cp docker-compose.yml.pre-femto docker-compose.yml && docker compose up -d pico`
  (instant; the previous `cioraneanu/firefly-pico:dev` image is still on the Pi), or
- `git revert ba8ce89 && docker compose up -d pico`.

## Open items
- PR #5 carries the two `ci(femto)` workflow commits (owner chose to keep the workflow on `femto`,
  not a side branch). Drop from the PR if not wanted upstream.
- Dev-PC copy of `wg-cash` is one commit behind `origin/main` (the deploy was committed on the Pi).
- Leftover on the Pi from the failed first build: `~/firefly-pico-femto` checkout + aborted build
  cache. Harmless; not pruned (destructive on shared infra) — clean up on request.
- "Not built/run on the dev PC" caveat is resolved: the GitHub Actions build (and the live container)
  compile the femto changes cleanly.
