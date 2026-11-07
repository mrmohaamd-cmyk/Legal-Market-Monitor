# Prepared posting implementation — local only

This work replaces the former multi-key claim prototype with an atomic posting ledger and moderator operations. It is not deployed, submitted for review, or active in any community. The hosted app remains private 0.0.3. Both source-controlled posting permissions remain false; requests and settings cannot override them. The earlier README-only 0.0.4 package is superseded and must not be uploaded.

## Verified local artifact

On 7 November 2026, all **153 repository tests passed**, with zero failures or skips. This includes pinned-SDK Redis reply decoding, 25 concurrent scheduled callbacks creating one simulated post, 25 concurrent private confirmations creating one simulated post, positive reconciliation after a lost reply, deletion-before/after-receipt races, denied member actions, and concurrent Start/Stop generations. TypeScript, the pinned Devvit 0.15.2 configuration schema and the CommonJS bundle also passed. These are local tests; they are not evidence of real Redis transactions or posts on Reddit.

The official CLI's offline source packager produced a 21-file, 151,195-byte archive at `2026-11-07T01:59:39.190Z`. Every archived file matched the [manifest](reddit-source-manifest-0.0.4.json). Archive SHA-256: `79614697c9397d808373d60789217320f41c2d81c0b37e0e9bdbffbfd6b1e5e8`. Source ignores excluded dependencies, build output, environment files and credentials; a private-key marker check passed. Those checks do not certify the absence of every conceivable secret. This archive has both posting gates false and is not the later private-test-enabled build.

The CI configuration now runs the full tests after installing pinned bot dependencies, so the SDK wire-decoding check is exercised there as well. A local pass is not a claim that a new GitHub Actions run has completed.

## Implemented behavior

- One post per verified advertised opportunity, preserving unknown work model/deadline and seven-day source/application/editorial evidence checks. Evergreen recruitment routes remain excluded.
- One CAS ledger atomically reserves the UTC day and hashed record/normalized identity. A pending or uncertain attempt pauses all jobs, even a different job on a later day. Legacy claims, missing/corrupt state, backwards clocks and capacity exhaustion fail closed.
- Posts use the app account and include a unique attempt marker. The Reddit adapter independently reads the created post to verify author, community, title and body. Errors after creation remain uncertain; no automatic resubmission occurs.
- Recovery positively matches an existing owned post. Missing/deleted posts are not proof of failure. Reserved work may be explicitly cancelled before submission, but its job/day claims stay consumed.
- Suppression commits before author deletion. Deletion/removal events scrub tracked raw post receipts; no Reddit post body, title, URL or author identity is stored. Redacted events still propagate temporary storage failures for retry. Unknown events require trusted app-author identity during receipt races.
- Moderator controls independently check current-community post permissions on every menu/form request. Status, initialization, one-off posting, start/stop, fixed private test, reconciliation, reserved cancellation and post deletion are implemented. Ordinary members retain the four information menus.
- A manually confirmed daily schedule proposes 09:00 Saudi time (06:00 UTC), capped at one attempt per UTC day. Persistent tokens reject stale callbacks. Stop persists before cancellation and cannot cancel a newer Start generation. A request already in flight cannot be recalled. No automatic cron or install/upgrade activation exists.
- The private fixture is fixed, contains no employer/application links, ignores supplied feeds and has its own permanent one-use claim. A private installation cannot start the production schedule.

## Exact next private test scope

Use the [private test plan](reddit-private-posting-test-plan.md). The smallest meaningful next authorization covers an exact private-testing build, upload/upgrade only in r/saudilaw_jobs_dev, explicit first-time ledger initialization, and one moderator-confirmed synthetic post with necessary ledger read/write and readback. That build would change only the private-test release permission to true; production permission stays false. The private-test installation setting remains off until the supervised action. The added deletion-event capability must be disclosed in the deployment permission comparison; do not call this identical to 0.0.3's capability set.

Exact synthetic title:

> [PRIVATE TEST - NOT A JOB] SaudiLaw Jobs delivery check

The body explains that this is not a vacancy, employer advertisement or application opportunity, includes no application link, asks for no personal information, and ends with a random attempt reference. The runtime's exact fixture in `reddit-bot/lib/core.mjs` is the source of truth.

Repeating the same private action must produce no additional post. Independently verify the APP author, private community, full body, marker and durable receipt, including actual hosted transaction responses. Do not create a real uncertain network outcome deliberately on Reddit merely to test it; local failure injection covers those cases. The hosted test must never be reported as proof of all failure modes.

Removing that exact disposable post through author deletion requires its separately stated authorization. A synthetic test cannot prove live employer-link rendering, real vacancy accuracy, production-community moderation behavior or scheduler persistence. Those remain distinct tests and approvals.

## Remaining review and operational limits

Native mobile and actual ordinary-member sessions remain unverified. No account was created or invited and no private-community access was expanded. The published policies describe the hosted preview; proposed [terms](reddit-posting-terms-draft.md) and [privacy notice](reddit-posting-privacy-draft.md) remain unadopted drafts, with [change notes](reddit-posting-privacy-changes-draft.md). New controls, hosted Redis WATCH-conflict behavior, real post/deletion delivery and scheduler persistence need integration evidence. Scheduler tests currently use local adapters only.

The app description and full review request must match the final release. Reddit review and explicit off-platform link permission remain unsubmitted; future production posts need fresh source checks, approved policy wording, Reddit approval and specific launch/cadence authorization. Unlisted visibility never substitutes for approval. None of this preparation creates a post, recurring job, new credential, paid service or production installation.
