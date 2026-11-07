# Private 0.0.3 upgrade and browser-test blocker

The owner explicitly approved uploading the prepared new version, upgrading the existing private test installation and verifying its menus. The source candidate is commit `d6ea41b8f774f988a791634b49e9affed5d961b7`; preflight confirmed all 15 files matched the saved source manifest and version 0.0.3 was unused.

## Completed

- Official CLI `upload --version 0.0.3` completed successfully.
- Official CLI `install saudilaw_jobs_dev saudilaw-jobs@0.0.3` explicitly upgraded the existing installation from 0.0.2 and reported success.
- A direct official API read at `2026-11-07T00:42:44.209Z` confirmed that installation ACTIVE on 0.0.3, with manual upgrades. The version was PRIVATE/READY.
- Capability categories matched 0.0.2 exactly. The uploaded README matched the candidate byte-for-byte (SHA-256 `9b47d992ddfbb9954d3eb771947a527376b9c5bfce0a2d4694b9d25ef3023f9f`).
- The temporary 1280 x 900 browser viewport override was successfully reset in the following recovery turn.
- A second independent official API read at `2026-11-07T00:48:32.172Z` reconfirmed private READY 0.0.3, the ACTIVE/manual private installation, zero r/SaudiLaw installations, saved policy URLs and approved `api.github.com`. The description remains empty.

No app review, unlisting, r/SaudiLaw installation, message, post or recurring activation was performed. Existing policy URLs remain adopted and published. No new credentials or permission categories were added.

## What the browser did and did not establish

The installation portal initially continued to display 0.0.2 despite the successful upgrade; the fresh direct API established 0.0.3. Portal settings displayed feed checks off and dry run on, but that stale version label means the portal alone was not treated as fresh deployment proof.

The recovery API reads did not refresh the saved `enabled`/`dryRun` values: the scoped settings schema was found, but its production route was not established, so no speculative request was made. No settings were changed by the upload/test/recovery work. The unchanged code-level posting lock and absence of a production installation remain separate verified controls.

The private community page still displayed no posts. Mouse interactions timed out, keyboard activation did not expose the menu, and screenshot capture timed out. Windows-native recovery then stopped Computer Use because it could not determine the browser URL confidently enough to enforce its policy. No further native interaction was attempted after that stop.

In the next authorized recovery turn, the viewport reset succeeded. The task's Reddit tab was no longer open; the browser exposed only an unrelated user tab. Creating a new controlled test tab failed because the extension could not make it active. Inspection confirmed no test tab was created. The unrelated user tab was left unchanged, and the browser session was completed cleanly.

**The new About, Terms, Privacy and Contact menu actions have not passed native UI verification.** The successful upload/API read, local tests and readable policy pages cannot substitute for clicking these actions in Reddit. Mobile-app and ordinary-member behavior also remain unverified.

## Smallest next step

Open `https://www.reddit.com/r/saudilaw_jobs_dev/` in the connected Chrome browser and keep that tab active in the foreground. Then resume verification of the already-installed 0.0.3. No additional upload, upgrade or deployment approval is needed merely to resume these same authorized tests.

Verify the installed menus, About message and fixed policy/support navigation; do not send the support message. Only after browser control works should any approved forced-preview check be attempted, with checks restored off afterward. Keep the prior [candidate test plan](reddit-release-candidate-0.0.3.md) for mobile/role checks and later review boundaries. This receipt supersedes its historical statement that 0.0.3 has not been uploaded.
