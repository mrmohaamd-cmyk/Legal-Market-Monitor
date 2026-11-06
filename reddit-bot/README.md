# SaudiLaw jobs prototype

Prepared for r/SaudiLaw: one ordinary Reddit text post per reviewed advertised job or training programme. **Disabled, dry-run, unregistered and undeployed.** The proposed `saudilaw-jobs` app name has not been reserved or checked for availability. No Reddit credentials are needed for local work.

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

## Publication and eligibility contract

The only runtime feed is `dist/opportunities.json` from the public repository's **main** branch. That branch is the existing reviewed publication boundary; the feed has no per-record `published` flag. The bot never reads an automatic proposal branch, writes the feed, merges a PR, or renews verification timestamps.

The whole feed fails closed on malformed structure, duplicate IDs, invalid/future evidence, unsafe URLs or a changed seven-day policy. Candidates must be `advertised_opening`, `open`, source-verified and within 168 hours of each source/application/editorial check. At exactly 168 hours, evidence expires. Explicit deadlines and editorial review cutoffs suppress a listing; absence of evidence never proves closure. Missing fields remain unknown.

The reviewed registry pins each approved record ID, employer, title, Saudi location and exact source/application URLs. It currently covers A&O's winter COOP, Segal's Student Intern and White & Case's Saudi Law Trainee 2027. New listings or destination changes require a reviewed code update as well as a reviewed feed update. A recent `recruitment_route` record never becomes a vacancy. Known date-only deadlines also have conservative registry rechecks at the start of the relevant Riyadh date, explicitly separate from the employer's unknown closing instant.

Application evidence may establish an available public form or a login entry; it does not establish authenticated programme selection or successful submission. Posts retain those caveats. Work model is “Not stated in the reviewed feed” unless explicitly sourced in new reviewed fields; the bot does not infer remote/on-site from city. It uses existing source summaries and requirements, without an LLM or invented employer facts. Live source corroboration found A&O's office-based label, but this prototype intentionally leaves the published feed unchanged.

## Safety controls and data

- Installation defaults: `enabled=false`, `dryRun=true`. Missing/non-boolean settings fail closed.
- `runtime.mjs` also hard-locks live posting with `LIVE_POSTING_ALLOWED=false`. Settings cannot bypass that code gate.
- No cron, install/upgrade trigger, public endpoint, user-account action, PM, crosspost or paid integration exists. Only trusted context identifying r/SaudiLaw is accepted.
- The core's future live adapter uses the app account and allows at most one attempted post per run and per UTC calendar day. This is not a rolling 24-hour cap; posting cadence must be reviewed separately before activation.
- Redis atomically claims the day, stable record ID, and normalized employer/title/location with `SET NX`. Every successful claim must return exactly `OK` before submitting. Claims have no expiry. Partial/ambiguous writes stop submission and consume the slot conservatively.
- A timeout or malformed Reddit response remains pending/uncertain; a returned post ID with failed receipt storage is logged for reconciliation. Claims prevent automatic retries. This aims for at-most-once attempts, not exactly-once delivery. A missed post is preferred to an accidental duplicate.
- Evidence is checked again immediately before submit; expiry, clock regression or crossing UTC midnight stops the attempt. Removed posts retain deduplication tombstones and are not recreated.

Redis stores only job IDs/normalized identities, UTC day, attempt time/state and bot post IDs. It stores no applicant data or Reddit user content. Logs include result status, IDs, errors/skips and public feed provenance. Permanent tombstones require an explicit retention policy before launch. Do not wipe/reinitialize the ledger or reinstall under another app identity and then resume posting: reconcile existing posts first. No key cleanup/retry endpoint is included in this prototype.

For an uncertain result, disable checking, inspect app logs and the destination community, and locate the draft's stable `Reference` ID before doing anything else. Record a found post as posted under both identity keys; never repost because a local receipt is missing. If absence cannot be established, retain pending claims. This prototype provides no automatic reset or destructive repair tool. Keep the known day/ID/identity key formulas in `claimKeys()` when reconciling; Devvit cannot globally enumerate arbitrary Redis keys.

Existing Reddit posts are static snapshots. The bot will not silently edit/remove a post if a source closes later; moderators must handle withdrawals and corrections. Source-review coverage is partial and not a complete legal-job search. A&O and Segal still require browser/editorial review in the upstream verifier.

## Fetch Domains

`api.github.com`: unauthenticated HTTPS GET to this repository's fixed contents endpoint with `ref=main`. The JSON/base64 envelope is bounded, its file path/size/Git blob SHA checked, and redirects/errors/rate limits rejected. No GitHub token is used. Employer application sites are link destinations, not runtime fetch domains. Reddit approval for this hostname and permission to direct users off-platform are **not yet obtained**.

## Before any Reddit action

See [review and launch notes](../docs/reddit-app-review.md) for official sources and costs. Obtain owner approval for registration/access, test-community playtesting, test posts, app upload/review, installation and activation. Finalize terms/privacy/contact details and request domain/external-link approval. Verify subreddit posting/flair rules and app-name availability. A test community requires an explicitly reviewed destination-allowlist change; the current prototype only accepts r/SaudiLaw and still cannot post.

After authorized integration testing, a separate reviewed change would unlock the live adapter and add an approved schedule. Do not enable those as part of merging this prototype. Local schema, fake-storage concurrency tests and compilation do not prove Devvit runtime integration or Reddit approval. Reddit currently documents free Devvit hosting; this design needs no paid service. Human verification/moderation remains necessary.
