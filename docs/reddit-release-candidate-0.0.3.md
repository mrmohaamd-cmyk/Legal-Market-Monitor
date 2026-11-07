# SaudiLaw Jobs 0.0.3 private-test candidate

Prepared locally on 7 November 2026. **Not uploaded, installed, submitted for review or enabled.** This is a preview-only candidate; it is ready for the next authorized private integration test, not verified for production posting.

## Exact scope

The candidate adds four member-visible subreddit menu actions: About (a short preview-only toast), Terms, Privacy and Contact moderators (explicit navigation to fixed approved destinations). They work independently of feed-check settings and make no feed, settings, storage or Reddit API calls. They accept only POST on the exact routes and only trusted context for r/SaudiLaw or r/saudilaw_jobs_dev. No input supplies a URL or community. The existing preview action remains moderator-only.

Runtime permissions, the posting lock, scheduler configuration, disabled defaults and source-verification policy are unchanged. No recurring task, post, application form, message sender or cleanup endpoint is introduced. The adopted notices remain the exact main-branch documents published in commit `b871dfe` and saved in Reddit app details.

The 723-word app-root README now explains every menu and setting, links the active notices, and contains the external-link request itself. Detailed engineering/history is preserved in DEVELOPMENT.md. The CLI reads app-root README into the uploaded version's `about`; a request only in this outer docs directory would not suffice. The app source archive excludes dependencies, generated builds/previews and credential-like environment/key files.

## Prepared app description

> Preview-only checks of reviewed Saudi legal opportunities for moderators, with public terms, privacy and support links. No job posts or applications.

This description is prepared, not saved remotely. The remote description is still empty. The README accurately separates this release from planned employer-link job posting; approval of the preview must not be presented as approval of later changed posting code.

## Evidence

| Check | Result and limits |
|---|---|
| Repository tests | 96 passed, including 46 Reddit tests and the existing 30-overlapping-run simulation. The five new menu tests cover actual Node HTTP responses, fixed links, community/method/path rejection, and unchanged moderator access/defaults. |
| Final About wording | Five menu tests rerun successfully after shortening the toast; SDK check rerun successfully. |
| SDK 0.15.2 | Type-check, official configuration schema validation and CommonJS bundle build passed. |
| Existing site build | Passed; feed and verification timestamps unchanged. |
| Source packaging | Official source archiver run locally without authentication/network/upload. All 15 archived source filenames and SHA-256 hashes matched the manifest. |
| Published notices | Both public GitHub pages and exact saved Reddit URL fields were verified during policy publication. |
| Existing Reddit installation | At `2026-11-07T00:28:07.465Z`, versions 0.0.1/0.0.2 were PRIVATE/READY; only r/saudilaw_jobs_dev had an active installation, on 0.0.2 with manual upgrades. r/SaudiLaw had none. |
| Native candidate UI | **Not tested.** Local response tests do not prove Reddit menu visibility, external confirmation/navigation, toast display or mobile accessibility. |
| Actual posting/storage | **Not tested in Reddit and not enabled in this release.** The previous live test was a backend-only preview. |

Archive: `saudilaw-jobs-0.0.3-review-source.zip`, **94,887 bytes**, SHA-256 **`a62aade9e80c58fd42d691a06843c01e6ddcbc26a03ccd677e267172d2a9b4d0`**. The [source manifest](reddit-source-manifest-0.0.3.json) records each file. Archive generation is not publication or submission. Recheck the manifest against the actual checkout before any future upload; a later edit makes this snapshot stale.

## Next authorization boundary and native test

The earlier specific upload/upgrade approval covered 0.0.2. The concrete next action is **upload this candidate as private 0.0.3 and upgrade only the existing r/saudilaw_jobs_dev installation, then test its menus and forced preview**. This replaces installed code in that private community; the declared Reddit API, Redis and approved GitHub access remain unchanged. No review submission, public directory listing, r/SaudiLaw installation, message or post is part of that action. No upload was attempted or denied in this preparation.

After that authorization:

1. Recheck owner, candidate source hashes, available version and exact private destination. Upload and explicitly upgrade the same installation; upload alone does not upgrade it.
2. With checking off, verify About, Terms, Privacy and Contact moderators on Reddit web. Confirm external navigation warnings and exact destinations. Open only the blank support composer; send nothing.
3. Exercise mobile behavior and ordinary-member visibility using authorized available sessions. Owner/desktop testing does not establish those results. Do not create another account, invite a member or grant access without its required authorization. If no appropriate device/account is available, retain that limitation.
4. Run one forced preview if current source evidence remains valid, then restore checking off with dry run on and verify persisted settings. Confirm no posts. Information/preview paths cannot write ledger records by construction; do not claim a direct Redis audit without one.
5. Record actual installed version, UI evidence and any failures; fix and retest within the applicable upload/upgrade authority before calling the release review-ready.

## Eventual review implications

The pinned CLI's `publish` creates a new version, uploads its source ZIP, submits `{appVersionId, visibility}` and attempts immediate UNLISTED visibility for this server-only app. No review-only/notes flag exists. The explicit request must remain in the uploaded README. If private 0.0.3 is uploaded first, the next publication would ordinarily be 0.0.4; confirm the actual available version and source revision at that time.

Review/publication needs separate specific authorization after the exact release and test evidence are ready. Do not infer external-link approval from successful publication or an UNLISTED flag. Inspect Reddit's actual review response. A future posting release also needs deletion/reconciliation implementation, controlled post/storage tests, fresh source evidence, review of that changed release and explicit production installation/cadence authorization. None is granted by this candidate.

Official references: [menu actions](https://developers.reddit.com/docs/capabilities/client/menu-actions), [navigation](https://developers.reddit.com/docs/capabilities/client/navigation), [launch testing](https://developers.reddit.com/docs/guides/launch/launch-guide), [CLI publication](https://developers.reddit.com/docs/guides/tools/devvit_cli#devvit-publish). Version-specific source-upload/unlisting effects were verified in the installed official CLI 0.15.2 code.
