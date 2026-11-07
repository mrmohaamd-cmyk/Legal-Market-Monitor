# SaudiLaw jobs prototype

Prepared for r/SaudiLaw: one ordinary Reddit text post per reviewed advertised job or training programme. **Private version `0.0.2` is installed only in r/saudilaw_jobs_dev; its authorized backend preview succeeded.** Feed checks were restored off, dry run is on and live posting remains hard-locked. Zero posts were observed; prior CLI inspection found no r/SaudiLaw installation and no later action targeted it. No Reddit credentials are needed for local tests or previews.

## Local review

Use Node.js 24.18.0+ (validated locally with 24.21.0). From the repository root:

```sh
npm test
npm run build
cd reddit-bot
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run preview
```

`check` type-checks the server against pinned Devvit 0.15.2, validates `devvit.json` with that SDK's schema, and builds a local CommonJS bundle. `preview` reads the local feed and writes `preview-output/report.json` and `preview-output/posts.md`; it never invokes Reddit or durable storage. `npm run preview -- --published` optionally reads the real public GitHub API feed and records its verified Git blob SHA. A successful download does not reverify employer pages.

No npm script invokes Devvit upload, publish, playtest, installation or sign-in. See [the saved preview](../docs/reddit-preview-2026-11-06.md) and [review requirements](../docs/reddit-app-review.md).

Moderators can use **Preview SaudiLaw jobs** from the subreddit menu. Enable feed checks in the private installation settings to allow the read; leave dry run on. The menu always forces preview mode and receives no posting/storage adapter. Version `0.0.2` includes the exact private-community preview allowlist and Content-Length correction. Its authorized test logged `dry-run`, three eligible drafts, five excluded records and no validation errors at `2026-11-06T23:57:03.559Z`, without Content-Length or bridge errors. Visual toast display was not captured, so native feedback is not yet verified. Feed checks were restored off and that setting persisted after reload; no posts appeared. See the [setup packet](../docs/reddit-setup-draft.md).

## Publication and eligibility contract

The only runtime feed is `dist/opportunities.json` from the public repository's **main** branch. That branch is the existing reviewed publication boundary; the feed has no per-record `published` flag. The bot never reads an automatic proposal branch, writes the feed, merges a PR, or renews verification timestamps.

The whole feed fails closed on malformed structure, duplicate IDs, invalid/future evidence, unsafe URLs or a changed seven-day policy. Candidates must be `advertised_opening`, `open`, source-verified and within 168 hours of each source/application/editorial check. At exactly 168 hours, evidence expires. Explicit deadlines and editorial review cutoffs suppress a listing; absence of evidence never proves closure. Missing fields remain unknown.

The reviewed registry pins each approved record ID, employer, title, Saudi location and exact source/application URLs. It currently covers A&O's winter COOP, Segal's Student Intern and White & Case's Saudi Law Trainee 2027. New listings or destination changes require a reviewed code update as well as a reviewed feed update. A recent `recruitment_route` record never becomes a vacancy. Known date-only deadlines also have conservative registry rechecks at the start of the relevant Riyadh date, explicitly separate from the employer's unknown closing instant.

Application evidence may establish an available public form or a login entry; it does not establish authenticated programme selection or successful submission. Posts retain those caveats. Work model is “Not stated in the reviewed feed” unless explicitly sourced in new reviewed fields; the bot does not infer remote/on-site from city. It uses existing source summaries and requirements, without an LLM or invented employer facts. Live source corroboration found A&O's office-based label, but this prototype intentionally leaves the published feed unchanged.

## Safety controls and data

- Installation defaults: `enabled=false`, `dryRun=true`. Missing/non-boolean settings fail closed.
- `runtime.mjs` also hard-locks live posting with `LIVE_POSTING_ALLOWED=false`. Settings cannot bypass that code gate.
- No cron, install/upgrade trigger, public endpoint, user-account action, PM, crosspost or paid integration exists. The scheduled path accepts only trusted context identifying r/SaudiLaw; the proposed private-community exception is confined to forced preview.
- The core's future live adapter uses the app account and allows at most one attempted post per run and per UTC calendar day. This is not a rolling 24-hour cap; posting cadence must be reviewed separately before activation.
- Redis atomically claims the day, stable record ID, and normalized employer/title/location with `SET NX`. Every successful claim must return exactly `OK` before submitting. Claims have no expiry. Partial/ambiguous writes stop submission and consume the slot conservatively.
- A timeout or malformed Reddit response remains pending/uncertain; a returned post ID with failed receipt storage is logged for reconciliation. Claims prevent automatic retries. This aims for at-most-once attempts, not exactly-once delivery. A missed post is preferred to an accidental duplicate.
- Evidence is checked again immediately before submit; expiry, clock regression or crossing UTC midnight stops the attempt. Removed posts retain deduplication tombstones and are not recreated.

Redis stores only job IDs/normalized identities, UTC day, attempt time/state and bot post IDs. It stores no applicant data or Reddit user content. Logs include result status, IDs, errors/skips and public feed provenance. Permanent tombstones require an explicit retention policy before launch. Do not wipe/reinitialize the ledger or reinstall under another app identity and then resume posting: reconcile existing posts first. No key cleanup/retry endpoint is included in this prototype.

For an uncertain result, disable checking, inspect app logs and the destination community, and locate the draft's stable `Reference` ID before doing anything else. Record a found post as posted under both identity keys; never repost because a local receipt is missing. If absence cannot be established, retain pending claims. This prototype provides no automatic reset or destructive repair tool. Keep the known day/ID/identity key formulas in `claimKeys()` when reconciling; Devvit cannot globally enumerate arbitrary Redis keys.

Existing Reddit posts are static snapshots. The bot will not silently edit/remove a post if a source closes later; moderators must handle withdrawals and corrections. Source-review coverage is partial and not a complete legal-job search. A&O and Segal still require browser/editorial review in the upstream verifier.

## Fetch Domains

`api.github.com`: unauthenticated HTTPS GET to this repository's fixed contents endpoint with `ref=main`. The JSON/base64 envelope is bounded, its file path/size/Git blob SHA checked, and redirects/errors/rate limits rejected. No GitHub token is used. Employer application sites are link destinations, not runtime fetch domains. The app's Developer Settings page now shows this hostname **Approved**. This does not establish general app-review approval or permission to direct users off-platform; both remain outstanding, and app terms/privacy URLs are absent.

## Reddit setup and next action

The official Devvit CLI 0.15.2 requests OAuth `scope=*` with `duration=permanent`; this broad developer-account grant is distinct from the bot's runtime permissions. The owner specifically approved that grant, the actual Reddit consent matched, and CLI login/account verification succeeded. `devvit login` logs out any existing CLI session before starting consent, so do not rerun it as a read-only diagnostic. The official local linked-bundle check also passed without upload. See the [setup packet](../docs/reddit-setup-draft.md) for the next confirmation boundary.

**The approved first upload completed.** Devvit CLI 0.15.2 uploaded private version `0.0.1`, created r/saudilaw_jobs_dev, installed the app there and recorded that community in local configuration. The installation persists after the terminal stops. Browser inspection confirmed `enabled=false` and `dryRun=true`. Reddit assigned the app account **Everything** moderator permissions, as required by its app-installation flow, and also installed Devvit Admin Helper automatically. The optional developer-log-access grant was not changed. These broad platform permissions must not be described as posting-only access.

**The corrected private test completed after new specific approval.** Private `0.0.2` was uploaded and the existing r/saudilaw_jobs_dev installation was explicitly upgraded with unchanged Reddit API, Redis and approved `api.github.com` permissions. Feed checks were enabled for one forced preview, then restored off with dry run retained; logs were stopped. The earlier automatic-review denial is resolved historical context: execution resumed only after the owner expressly approved the changed upload, upgrade and test. No new community, r/SaudiLaw installation, post or recurrence was added. Later uploads still require a separate installation upgrade.

See [review and launch notes](../docs/reddit-app-review.md) for official sources and costs. Finalize terms/privacy/contact details, obtain general app and external-link review, and verify community/flair rules before a production proposal. Test posts, publication, r/SaudiLaw installation and activation remain separate future actions.

After authorized integration testing, a separate reviewed change would unlock the live adapter and add an approved schedule. Do not enable those as part of merging this prototype. Local schema, fake-storage concurrency tests and compilation do not prove Devvit runtime integration or Reddit approval. Reddit currently documents free Devvit hosting; this design needs no paid service. Human verification/moderation remains necessary.
