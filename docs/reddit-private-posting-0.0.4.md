# Private 0.0.4 posting test receipt

Observed 7 November 2026. **One authorized synthetic post was created and independently verified in the private r/saudilaw_jobs_dev community.** Production posting remains locked. The duplicate probe, author deletion and remaining native-client/role checks have not passed. This receipt omits the private post ID and random attempt marker; their exact evidence remains in the local `devvit-tools` directory and must not be copied into a public report.

This record supersedes the earlier implementation notes' statements that 0.0.4 was not uploaded and both gates were false. It does not establish completion of the full [private posting test plan](reddit-private-posting-test-plan.md).

## Approved scope and artifact

The owner approved publishing the revised notices and the controlled private test. The adopted [terms](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-terms.md) and [privacy notice](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-privacy.md) were published on `main` in commit [`3c1ea9d`](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/commit/3c1ea9d610dc1749f963cdebf39ae2b6a88d8349), effective 7 November 2026. That commit modified only those two documents, not app code.

The private candidate passed **155 local tests**, pinned Devvit 0.15.2 type checking, configuration-schema validation and the CommonJS build. The [21-file source manifest](reddit-source-manifest-0.0.4.json), captured at `2026-11-07T02:45:36.057Z`, records its source and archive. Archive size: 151,501 bytes; SHA-256: `c8512c3d7ebe6c6ffb2256e6b43e7abd1854007e199e600d457f55080b4fcf3d`.

The source-controlled [release policy](../reddit-bot/release-policy.mjs) changed the private-test gate to `true`; the production gate remains `false`. Installation settings cannot override the production gate. The test uses a fixed synthetic fixture, a separate private-test ledger and no vacancy-feed fetch, employer facts or application link. Its title is:

> [PRIVATE TEST — NOT A JOB] SaudiLaw Jobs delivery check

## Observed results

| Check | Evidence and limit |
|---|---|
| Upload and upgrade | Private version 0.0.4 uploaded at `2026-11-07T02:46:08.866Z`; the existing private installation was upgraded. No additional community was created. |
| Capability comparison | `REDDIT_TRIGGERS` was the only newly reported nutrition category. The unknown server category (`-1`) appeared in both compared versions. This was not described as an identical capability set. |
| Review state | The official review API returned zero review requests at `2026-11-07T02:48:44Z`. No review submission or unlisting was performed. |
| First-time initialization | Status initially reported an uninitialized ledger. Explicit initialization then produced a ready empty ledger at revision 0 in the private-test scope. |
| Single submission | One authorized attempt started at `2026-11-07T02:54:57.558Z`; Reddit recorded creation at `2026-11-07T02:55:00Z`. |
| Durable receipt | Status subsequently reported ready, revision 3, attempt count 1 and one receipt, with no active pause or halt. This establishes the successful hosted reservation/submission/receipt path, not all contention or failure branches. |
| Independent post verification | At `2026-11-07T02:58:59Z`, an official API read confirmed the exact private community, app-account author, title, full fixture body and unique attempt marker. The post was not deleted, moderator-removed or quarantined at that observation. |
| Desktop rendering | The private-community page and Reddit's old-design permalink displayed the expected fixture content. This is desktop evidence, not mobile or ordinary-member coverage. |
| Restored installation settings | Saved-state readback at `2026-11-07T03:08:02.517Z` confirmed `enabled=false`, `dryRun=true` and `privateTestEnabled=false`. The update was acknowledged with zero validation errors; other saved fields and secret configuration were unchanged. |

## Interrupted checks and final-state limits

The duplicate probe did **not** reach its confirmation form: the menu interaction timed out. No second confirmed action or duplicate-prevention result was observed. Local duplicate tests remain useful evidence but do not convert this incomplete hosted probe into a pass.

Author deletion was **not attempted**. The verified fixture still existed at the last post observation. The deletion control, deletion-event delivery and cleanup of the raw post receipt therefore remain unverified in Reddit; no successful deletion or complete cleanup is claimed.

Browser recovery reported a 0 × 0 page. The documented viewport/window recovery attempts did not restore a usable view, so unfinished browser checks were stopped. No hidden-handler invocation was substituted for the missing UI evidence.

The private-test installation switch was restored off and independently read back as recorded above. The private source gate remains true, and the permanent single-fixture claim is present; those facts are separate from the disabled installation switch. Production remains source-locked. No recurring schedule was started during this test; the settings readback alone does not inspect Reddit's scheduler job list.

## Remaining work

- Record the actual scheduler/job state before any later scheduling test or activation; the restored settings do not themselves establish that integration result.
- Complete the authorized duplicate rejection through its real moderator control when browser access works; preserve the same permanent fixture claim and do not initialize/reset the ledger again.
- Complete the separately scoped author deletion and verify both Reddit state and scoped ledger/event cleanup. Do not equate moderator removal with author deletion.
- Test the relevant controls as an ordinary member and on actual mobile surfaces. No new account, invitation or access grant is implied.
- Preserve missing real-scheduler, production moderation and employer-link rendering evidence. This synthetic post cannot establish vacancy accuracy, application navigation or a real job post's final presentation.

No recurring schedule, production installation/activation, app-code merge to `main`, Reddit review submission or public directory release was performed. Submission of the actual posting release and permission for its off-platform employer/application links remain outstanding. Private-post success, approved GitHub fetching and visibility are not substitutes for Reddit's review decision.
