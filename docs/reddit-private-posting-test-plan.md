# Private posting integration test plan

Prepared 7 November 2026. **Plan only: no deployment, post, deletion, review submission or activation was performed.** This plan is for the locally prepared posting release, not evidence that private preview version 0.0.3 can post. Its final interfaces and source revision must be recorded before execution.

The existing receipts establish a private 0.0.2 feed preview and 0.0.3 desktop information menus/disabled-preview behavior. They do not establish real posting, durable reconciliation, deletion, scheduled delivery, native mobile or ordinary-member behavior. See the [0.0.3 receipt](reddit-private-upgrade-0.0.3.md).

## Authorization and test contract

Existing developer access, the private community and prior preview-only upload/menu approvals can be reused within their scope. They do not automatically authorize a changed posting build, a real post, deletion, a new account/community, a new permission, review publication or recurring posting. The current task authorizes local preparation only.

Before the private test, present the exact candidate revision, version, source manifest, permission diff, rendered fixture and controls. Obtain authorization for the changed private upload/upgrade, explicit first-time initialization of its private-test ledger and **at most one submission attempt** in r/saudilaw_jobs_dev, including inspection and the planned author deletion of that exact app-created test post. An uncertain attempt consumes this allowance; it is not permission to retry. If testing requires an additional account invitation or persistent permission, identify and authorize that action separately.

The minimum implementation contract is:

- Trusted installation context restricts this test to `saudilaw_jobs_dev`. Request fields cannot choose a destination. No r/SaudiLaw installation or production activation is involved.
- A moderator selects **Private posting test** and the fixed acknowledgement form. The core ignores the feed and uses one synthetic fixture titled `[PRIVATE TEST — NOT A JOB] SaudiLaw Jobs delivery check`, containing no employer claims or application link. A separate `private-test` namespace and permanent fixture claim allow at most one attempt ever; repeated requests cannot select a real job or another fixture.
- Use the real submission/claim/receipt pipeline, `runAs: 'APP'`, durable atomic claims and an installation-scoped ledger. Preview and information actions retain no submission capability.
- Defaults remain disabled/dry-run. No install/upgrade/startup action creates a post. No recurring job is armed for this test. Any scheduled smoke test is separately identified, dry-run and bounded; manual success alone does not prove scheduled delivery.
- **Initialize posting ledger** is an explicit first-time step in the same private community and `private-test` mode, using the fixed acknowledgement `INITIALIZE NEW LEDGER`. It is permitted only after independently establishing no earlier posting and no lost ledger. Starting or posting must not initialize missing state; initialization must not replace an existing ledger or be used for recovery.
- **Reconcile bot post** and **Remove bot post** verify the same installation, ledger reference and app-owned post before acting. They must not accept an arbitrary post ID as authority. Unknown or inconsistent state stops posting. All moderator controls require server-side authorization, not just hidden menu items.

These are acceptance criteria for the final candidate, not deployment claims. Both private and production code gates remain false before separately authorized preparation. **Job bot status**, **Publish next verified job**, **Start daily jobs** and **Stop daily jobs** are separate planned moderator controls; the private test must not arm the production controls. The proposed daily time, 06:00 UTC / 09:00 Riyadh, is not an approved or active cadence.

## Before the single attempt

1. Run the candidate's relevant automated tests, SDK checks, schema validation and build. Cover concurrent calls, partial claims, post-success/receipt-failure, unknown submission outcome, malformed settings, stale evidence, deletion and unauthorized controls locally. Do not inject failures into Reddit to create additional uncertain posts.
2. Reconcile the published [terms](saudilaw-jobs-terms.md) and [privacy notice](saudilaw-jobs-privacy.md) with the finished behavior. The adopted texts describe the current preview and a future ledger/deletion procedure. Prepare accurate revisions and obtain any required adoption/publication approval before using a posting-capable release. Document exact retained fields, support/deletion handling and what deletion does to deduplication.
3. Verify the fixed synthetic fixture and its separate namespace directly against the candidate code. It must not read the live feed, contain real employer/vacancy facts or include an application link. Preserve the exact title and body digest; never alter the public feed to make this test pass.
4. After the approved upgrade, independently verify version and PRIVATE visibility, the exact private installation, the specifically approved permission comparison (including the new deletion-event capability) and no production installation. Read saved controls after reload; establish that recurring jobs are absent/disarmed. Record the pre-test post count and only the fixture's scoped ledger state. Do not inspect unrelated secrets or all-app/global settings.
5. Inspect the exact fixture rendering and disclosure that it is not a job. Record the fixture identity, body digest, candidate source hash and UTC time. A changed digest requires re-review before arming. The fixture cannot establish real job-field rendering, employer-link navigation or application UX; those remain separate local tests and later approved integration work.
6. Before any post attempt, use **Job bot status** to determine whether this exact private-test ledger is uninitialized. Establish from prior receipts and installation history that the bot never posted here and no earlier ledger was lost. Only then, within the approved private setup, select **Initialize posting ledger**, enter `INITIALIZE NEW LEDGER`, and verify a ready empty ledger in the same scope. An existing ledger must remain unchanged; a missing ledger after any earlier initialization/posting is a recovery blocker, never permission to reinitialize. No production ledger is initialized by this test.

## Execute and verify

1. Arm only the approved private test, leaving production and recurring operation off, and invoke **Private posting test** once with its fixed acknowledgement. Capture the app result and narrow server logs. Immediately restore paused/dry-run controls and verify persistence after reload; retain the permanent fixture attempt claim.
2. On a confirmed post ID, inspect that exact Reddit post and ledger receipt. Require the private destination, app-account author, approved title/body and links, and exactly one new post. A successful HTTP response, toast or count alone is insufficient.
3. With the permanent fixture guard still enforced, exercise its duplicate rejection. It must create no second post, no real-job fallback and no new attempt. Test cross-day/concurrent behavior primarily with fixtures; do not change the device clock or reset live claims.
4. Complete the rendering/role matrix below against the same post. Do not submit an application or send a support message. Record unavailable coverage as untested.
5. Execute the specifically approved **Remove bot post** action on that exact fixture and enter `DELETE BOT POST`. Despite its menu label, the implemented adapter requests author deletion with `post.delete()` after verifying ownership and saving suppression. Confirm Reddit state and the corresponding scoped ledger cleanup/tombstone; a successful request alone does not prove deletion. Moderator removal through Reddit's separate controls is not equivalent. Verify the implemented deletion-event/privacy-cleanup path, or record that integration gap. Verify that later private tests cannot recreate the fixture; keep posting paused if cleanup removed protection or the outcome is ambiguous.
6. Finish with feed/posting checks disabled, dry run on, no live recurring jobs, no r/SaudiLaw installation and no unintended posts. Stop log streams. Save a sanitized receipt containing source/version hashes, timestamps, fixture/post IDs, results, retained ledger field names and unresolved limits; omit credentials, unrelated user data and full private-support content.

## Recovery rules

| Observed result | Required response |
|---|---|
| Storage/partial-claim uncertainty before submission | Pause; preserve successful claims; inspect only the approved record's keys. Do not erase claims or retry to make the test pass. |
| Submission timeout or missing confirmed ID | Assume a post may exist. Inspect the private community/app author for the exact reference and time; reconcile an existing match. No automatic second submission. |
| Post ID returned but receipt write failed | Verify that post, then use the tested scoped reconciliation procedure to repair its receipt without calling submit. |
| Post absent but outcome still ambiguous | Keep a suppressed/uncertain state. Absence in one listing is not proof of failure; further attempts require a concrete new decision. |
| Delete/remove event or cleanup failure | Pause and reconcile the exact post and scoped data. Preserve only the justified minimal suppression metadata; never retain post content merely to avoid duplicates. Resume only when deletion and duplicate prevention are both sound. |
| Unexpected post, permission or schedule | Stop controls, preserve evidence and report the exact effect. Do not widen scope or silently compensate through unrelated actions. |

Pinned SDK 0.15.2 distinguishes `post.remove(false)` (moderator removal, `Moderation.Remove`) from `post.delete()` (app-author deletion, `LinksAndComments.Del`, guarded by app-name/author matching). Both return `Promise<void>`; verify through a fresh read/UI observation rather than the old cached `Post` object. Post-delete events expose a source/reason and can originate from users, moderators or admins; process them idempotently without assuming every event is author deletion. The default `redis` client is installation-scoped. Inspect only known keys with `get`, `mGet` or `exists`; `del` returns no count, so confirm its result with a follow-up read. Keep justified suppression metadata while removing content/disposable indexes required by the deletion policy. These SDK facts were checked locally; no Reddit deletion or Redis inspection was performed.

## Native test matrix

| Session/surface | Minimum evidence |
|---|---|
| Moderator, Reddit desktop web | Posting/control visibility, disabled/dry-run guards, exact app-authored post rendering, policy confirmation/navigation, blank support composer, pause/delete/reconcile result. |
| Ordinary member, desktop web | Fixture/policy/support readability; moderator posting/settings/recovery controls unavailable. Use an already authorized account/session; do not create or invite one implicitly. |
| Moderator and member, actual mobile surface | Readable post, links and notices; correct role controls; no clipped essential action/feedback. Distinguish mobile web from native iOS/Android and name each tested client. A desktop viewport override is not a native-app test. |
| Real scheduler, if included in finished scope | Bounded dry-run dispatch with correct installation/settings and no write; record actual job and execution evidence. Live recurring posting remains outside this plan. |

Reddit's [launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide) asks for mobile/web and relevant account-role testing before submission. Missing coverage is a stated readiness gap, not an assumed waiver or a claim of an automatic CLI rejection.

## Release gate after integration

Submit the actual posting release for Reddit review only after its private integration results, accurate notices, metadata and source archive are ready. Request explicit permission for its employer/application destinations under the [external-sites rules](https://developers.reddit.com/docs/devvit_rules#be-careful-using-external-sites-or-services). Existing `api.github.com` fetch approval does not cover off-platform navigation; a private test or UNLISTED visibility does not establish approval. If Reddit blocks a private operation pending review, stop and resolve that platform requirement rather than bypassing it.

Review/publication is a separately authorized operation: the pinned CLI uploads source, creates a new version, submits review and may immediately make it UNLISTED. Inspect the actual review request/decision. After Reddit approves the exact posting behavior and external-link use, obtain specific authorization for production installation and a controlled manual real-job post before recurring activation. Recheck fresh verified vacancy/source/application evidence; inspect that actual job's fields and employer links on the relevant clients. The synthetic private test does not establish these results. The production >200-member requirement, agreed cadence, pause/recovery procedure and accurate final settings remain separate checks. This plan does not authorize any of those actions.
