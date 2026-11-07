# Private 0.0.3 upgrade and completed desktop menu tests

The owner explicitly approved uploading the prepared new version, upgrading the existing private test installation and verifying its menus. The source candidate is commit `d6ea41b8f774f988a791634b49e9affed5d961b7`; preflight confirmed all 15 files matched the saved source manifest and version 0.0.3 was unused.

## Completed

- Official CLI `upload --version 0.0.3` completed successfully.
- Official CLI `install saudilaw_jobs_dev saudilaw-jobs@0.0.3` explicitly upgraded the existing installation from 0.0.2 and reported success.
- A direct official API read at `2026-11-07T00:42:44.209Z` confirmed that installation ACTIVE on 0.0.3, with manual upgrades. The version was PRIVATE/READY.
- Capability categories matched 0.0.2 exactly. The uploaded README matched the candidate byte-for-byte (SHA-256 `9b47d992ddfbb9954d3eb771947a527376b9c5bfce0a2d4694b9d25ef3023f9f`).
- The temporary 1280 x 900 browser viewport override was successfully reset in the following recovery turn.
- A second independent official API read at `2026-11-07T00:48:32.172Z` reconfirmed private READY 0.0.3, the ACTIVE/manual private installation, zero r/SaudiLaw installations, saved policy URLs and approved `api.github.com`. The description remains empty.

No app review, unlisting, r/SaudiLaw installation, message, post or recurring activation was performed. Existing policy URLs remain adopted and published. No new credentials or permission categories were added.

## Earlier browser blocker (resolved)

The installation portal initially continued to display 0.0.2 despite the successful upgrade; the fresh direct API established 0.0.3. Portal settings displayed feed checks off and dry run on, but that stale version label means the portal alone was not treated as fresh deployment proof.

The recovery API reads did not refresh the saved `enabled`/`dryRun` values: the scoped settings schema was found, but its production route was not established, so no speculative request was made. No settings were changed by the upload/test/recovery work. The unchanged code-level posting lock and absence of a production installation remain separate verified controls.

The private community page still displayed no posts. Mouse interactions timed out, keyboard activation did not expose the menu, and screenshot capture timed out. Windows-native recovery then stopped Computer Use because it could not determine the browser URL confidently enough to enforce its policy. No further native interaction was attempted after that stop.

In the next authorized recovery turn, the viewport reset succeeded. The task's Reddit tab was no longer open; the browser exposed only an unrelated user tab. Creating a new controlled test tab failed because the extension could not make it active. Inspection confirmed no test tab was created. The unrelated user tab was left unchanged, and the browser session was completed cleanly.

Those failures did not establish native menu behavior. The later authorized recovery below resolves the desktop browser blocker without repeating the upgrade or using the stopped Windows-native route.

## Actual desktop Reddit verification, 7 November 2026

The owner asked the agent to open Chrome itself. The documented browser creation call reported an active-tab error, but a subsequent tab inventory established that the requested private-community tab had in fact opened. The agent claimed that exact tab, verified its Reddit URL and private community, and completed the tests through the browser's normal DOM controls. No stopped native-input route was retried. No additional upload, installation, permission grant or settings change was needed.

| Test | Observed result |
|---|---|
| Subreddit menu | All five installed actions appeared: About, Terms, Privacy, Contact moderators and moderator Preview. |
| About | Exact response observed in the DOM and a screenshot: `SaudiLaw Jobs is preview only; it does not publish jobs or accept applications. See Terms, Privacy or Contact moderators.` The screenshot shows Reddit visually truncating the long toast; the separate named menus remain available. |
| Terms | App action opened Reddit's external-link confirmation containing the exact approved GitHub terms URL. Continue opened that file in another tab, with heading `SaudiLaw Jobs - terms` and effective date 7 November 2026. |
| Privacy | App action opened the same confirmation flow for the exact approved privacy URL. Continue opened `SaudiLaw Jobs - privacy notice`, effective 7 November 2026, naming the approved operator. |
| Contact moderators | App action navigated to `https://www.reddit.com/message/compose?to=r/SaudiLaw`. Sender was u/BannedForThe7thTime, recipient r/SaudiLaw, title/message empty and Send disabled. Nothing was typed or sent. Returned to the private community afterward. |
| Disabled Preview | Actual menu invocation produced the official server log `{"status":"disabled"}` at `2026-11-07T01:01:12.178Z`; no error records appeared in the inspected window. This proves the disabled guard, not an enabled feed run or a visually captured preview toast. See the [sanitized log evidence](reddit-native-preview-disabled-2026-11-07.json). |
| Saved installation state | Fresh portal navigation showed Version 0.0.3 and upgrade history from 0.0.2. Enable feed checks was unchecked, Preview only was checked, and optional developer log access was unchecked. DOM and screenshot captured. No settings were edited or saved during these tests. |
| Community state | The private community displayed no posts. It was kept open as the requested browser deliverable. |

The browser's temporary 390 x 844 responsive override did not change the observed target screenshot dimensions. It was reset successfully; this attempt is **not** counted as a mobile-layout pass. Native iOS/Android and actual ordinary-member sessions remain untested. The current account is a moderator, so menu-role configuration tests do not establish ordinary-member behavior.

No enabled feed run was repeated on 0.0.3. The earlier real 0.0.2 run remains the evidence for three eligible candidates and five exclusions; the feed-preview implementation did not change in 0.0.3. No direct Redis audit or live posting/storage integration is claimed. Current code retains the posting lock and no recurring schedule. No app review, unlisting, production install, post, message or new access grant occurred.

## Next boundary

The desktop browser blocker is resolved. Keep mobile/ordinary-member coverage and actual posting/storage tests explicit as remaining limits. The remote description is still empty. Before a separately approved review release, update the app README's historical testing paragraph with this evidence and regenerate its source manifest/archive; the existing 0.0.3 source manifest remains an exact historical record of the uploaded candidate.

The next remote release action needs specific authorization: save the prepared preview-only description, upload the exact reviewed source in the publication flow and submit Reddit review. The inspected CLI may immediately make that new version UNLISTED; it is not a review-only operation. Reconfirm the next unused version (ordinarily 0.0.4) before doing it. No public directory listing or production activation is part of that proposal. Reddit approval of the preview must not be represented as approval of later changed posting code or employer links.

This receipt supersedes the historical candidate's not-uploaded/native-untested statements and earlier browser-recovery instructions. The [candidate test plan](reddit-release-candidate-0.0.3.md) remains a source snapshot, not current deployment status.
