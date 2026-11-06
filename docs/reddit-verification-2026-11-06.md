# Reddit prototype verification — 6 November 2026

Prepared against main commit `1cdd3202553d991bd9cabbaf172474f30bb2b983`. No Reddit app was registered, authenticated, uploaded, playtested, published or installed; no Reddit post or credential was created. The upstream feed, evidence timestamps, existing monitoring and published site files were not changed.

## Recorded checks

- Node.js 24.21.0; Devvit SDK/shared schema 0.15.2; TypeScript 7.0.2; esbuild 0.28.2, pinned with an npm lockfile.
- `npm test`: **84 passed, 0 failed**, including 34 Reddit-specific tests. The core suite simulates 30 overlapping runs, exact freshness expiry, UTC-midnight crossover, storage failures/ambiguous claims, submission timeout, missing post receipts and failed receipt persistence. Simulated submits never contact Reddit.
- Existing `npm run build`: passed all repository source and integration validations.
- `npm --prefix reddit-bot run check`: passed TypeScript checking, pinned official SDK configuration-schema validation and CommonJS bundling. The adapter's Redis and submit signatures compile against the actual SDK.
- `git diff --check`: passed.
- Independent read-only source/code review corroborated the three candidate employers and found no remaining blocking code defect after the midnight/logging fixes. Work-model absence is attributed to the feed because A&O's live source does state office-based.
- Live **read-only** public-feed transport at `2026-11-06T22:17:55.184Z` used GitHub's contents API with `ref=main`, verified blob `1591d9fb22bbfe2a2e8eeb5b8ad801f09e76d8b3`, and returned three eligible drafts / five excluded records. This blob matches the local main feed. See [machine report](reddit-dry-run-2026-11-06.json) and [draft posts](reddit-preview-2026-11-06.md).

The drafts contain employer, location, unknown work model, sourced role details/responsibilities/requirements, preserved deadline uncertainty, source/application links and dated availability caveats. Source-link checks corroborated advertised pages, but did not renew employer verification or authenticate/submit any application. The existing reviewed evidence for the three candidates expires at 11:45 UTC on 13 November unless independently reverified.

## Deliberate limits

The bot does not discover jobs, promote recruitment routes, update its registry automatically, or guarantee an employer will still accept an application. The preview is a point-in-time review artifact. The live adapter is hard-locked; toggling settings cannot post. New records/URLs need reviewed registry additions. Reddit posts would be static snapshots requiring moderator corrections on withdrawal.

Local tests verify logic and SDK compatibility, not Reddit runtime behavior, actual Redis isolation, permissions, app-account output, mobile/web rendering, platform rate limits or app-review approval. Those checks require an owner-approved test installation and test-post phase. A separate test-target allowlist change is needed before testing in a private community. Terms/privacy/contact details, feed-host and off-platform-link approval, app-name availability, community/flair rules and final activation authorization remain unresolved. See [review/launch notes](reddit-app-review.md) and [setup instructions](../reddit-bot/README.md).

## Setup follow-up

The user asked to progress setup and testing wherever access permits. Inspection of the available Chrome session found the Reddit developer site signed out. Its Log in link reached the Reddit username/password sign-in page; no moderator account was authenticated. The known local `~/.devvit/token` path was absent. Official Devvit CLI 0.15.2 tooling was installed into a separate local task-workspace directory using `--ignore-scripts`, without changing global PATH. Its version command returned `@devvit/cli/0.15.2 win32-x64 node-v24.21.0`; the token path remained absent afterward. No credential content was read, new credential created, Google identity selected, agreement accepted or persistent permission granted. Installing local development tooling is separate from registering or installing a Reddit app; neither Reddit action occurred.

The next required step is signing into the account that moderates r/SaudiLaw in the prepared browser tab. After that, inspect the real developer-registration/authorization screen and obtain action-specific confirmation for any creation or expansion of persistent access. This sign-in blocker does not establish that the owner has no existing developer app elsewhere. App-name availability, existing apps, community settings and review decisions remain unverified.

The code now includes a **Preview SaudiLaw jobs** moderator menu action. It forces dry-run mode, has no submit/storage adapter, and returns eligible/excluded counts with draft titles in logs. Disabled checks, rejected feeds and blocked installations give explicit feedback. No new target community, cron or posting unlock was added. The [setup packet](reddit-setup-draft.md) supplies a draft app description, fetch/off-platform review narrative and unadopted policy text with missing owner details clearly marked.

Follow-up validation: **87 tests passed**, including the moderator-preview and operational-log checks; the existing site validator passed; the Devvit adapter type-check, official configuration schema and CommonJS build passed. These remain local/CI checks. Reddit setup, upload/playtest, actual backend integration, test posts and review submission have not occurred.
