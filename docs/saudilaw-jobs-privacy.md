# SaudiLaw Jobs — privacy notice

**Effective 7 November 2026.**

## Operator and contact

SaudiLaw Jobs (`saudilaw-jobs`) is operated by Reddit user [u/BannedForThe7thTime](https://www.reddit.com/user/BannedForThe7thTime/) for r/SaudiLaw. Send questions, corrections or requests to delete information handled by the operator through [r/SaudiLaw modmail](https://www.reddit.com/message/compose?to=r/SaudiLaw), identifying the app and relevant post or reference ID.

## Information processed and its purpose

The app reads public opportunity records from `mrmohaamd-cmyk/Legal-Market-Monitor` on GitHub to evaluate and summarize advertised opportunities. Reddit supplies community context and installation settings. The app's GitHub request does not intentionally include Reddit viewer identities, applicant information or a GitHub credential.

To authorize moderator controls, the app temporarily reads the initiating Reddit user's identity and moderator permissions for the current community. It does not put those moderator identities in its posting ledger. It reads the app account's identity and independently reads nominated bot posts to verify their community, author, content and exact attempt reference during post confirmation, recovery or deletion. These post contents and author details are not copied into the ledger.

Reddit may deliver post-deletion/removal event data. The app uses the relevant post/community identity and, where needed, the app-author identity to decide whether cleanup applies. Event titles, bodies, application URLs and author details are not retained in the ledger. Public information and policy/navigation controls do not request viewer profiles or support correspondence. An attempted moderator-only action can require identity/permission verification even when the requester is ultimately denied access.

The app does not accept CVs, identity documents, application answers or applicant contact details. It has no advertising, payments, external account-linking or analytics integration.

## Stored operational records

Posting records are stored in Reddit's Redis service, scoped to the subreddit installation. Production and private-test ledgers use separate modes and keys. A ledger contains:

- Its schema/revision, community and mode; the active attempt reference and any halt reason.
- Hashes of public opportunity reference IDs and normalized employer/role/location identities, used to detect duplicates. Hashing is not a promise of anonymization.
- Random attempt references, UTC day, attempt/submission times and states such as reserved, submitting, posted, suppressed or deleted. The random reference also appears in the app-created post so an uncertain result can be matched to the correct attempt.
- A returned Reddit post ID and its hash while a posted receipt is retained; deletion/suppression state retains the relevant hash instead of the raw post ID.
- Hashed-post deletion markers needed to handle duplicate suppression and a deletion arriving before its receipt is committed.

The ledger does not store post titles or bodies, application URLs, applicant information or moderator/author identities. Reddit itself stores published posts as part of its service. The app's moderator status view exposes its operational status and recent post receipts to authorized moderators.

The revised custom-post candidate additionally stores immutable public-content snapshots in installation-scoped Reddit Redis: the reviewed Arabic/English brief, source/application links, fixed employer image descriptor, exact text fallback, rendered HTML and renderer/protocol versions. A small hash reference on the Reddit post retrieves that saved snapshot. These snapshots contain no applicant information or viewer profiles. They are separate from the posting ledger; removing a post does not recreate it or clear duplicate protection.

Owner-controlled approvals and schedule authorization use separate bounded installation records. They retain the configured owner's Reddit account ID, decision timestamps, exact job/content and source-identity hashes, approval/revocation state and expiry, expected revisions and chained audit receipt hashes. Schedule records also retain the explicit authorized window and random authorization reference. Actual account/moderator checks are transient; credentials and application data are not collected. Ordinary members do not receive the owner-control records. Owner approval never clears publication or deletion claims, and revocation does not silently rewrite an existing public snapshot.

Schedule storage contains a version, paused/starting/active state and, when applicable, a random generation token and Reddit scheduler job ID. Reddit also holds the scheduled job and its callback data. Installation settings control feed checks, production preview-only mode and the private-test switch. The stable-engine candidate additionally requires a current explicit owner grant. Its absence or expiry leaves posting blocked. A Stop action persists pause before provider cancellation.

Preview checks do not write a posting ledger. Explicit first-time initialization creates an empty ledger only after the moderator confirms no earlier posting or lost ledger. Starting or posting does not recreate missing storage automatically. A separately authorized private test uses the same protective record types for one synthetic fixture, reads no vacancy feed and contains no employer or application link.

## Retention, suppression and deletion

Ledger and schedule records have no automatic expiry. Minimal suppression metadata is kept while needed to prevent an old, removed, deleted or uncertain post from being recreated. The ledger has bounded capacity and stops accepting attempts when its limit is reached; it does not discard old claims to make room. This design does not permit retaining Reddit-derived information indefinitely when it is no longer needed or must be removed.

When a tracked post-deletion/removal event is processed, cleanup removes the raw post ID from its stored receipt and retains the necessary hashed suppression state. An uncertain deletion/receipt race can leave posting paused until reconciled. Before the moderator's deletion control requests author deletion of a verified app post, it saves a suppression marker and removes the raw receipt ID. If the subsequent Reddit deletion fails or its outcome is unclear, the post may still exist while the protective marker remains.

These controls do not erase every operational record or Reddit service log. Event delays, outages, storage failures and uncertain API outcomes can delay cleanup; deletion is not promised to be instantaneous. Suppression metadata is not the deleted post's title, body or application URL, and those contents are not cached in the ledger.

On shutdown, when records are no longer needed, when Reddit requires it or for an applicable deletion request, the operator must pause posting, reconcile outstanding attempts and remove information under the operator's control as required. Removing duplicate protection may require keeping posting disabled so an old opportunity cannot reappear. There is no automatic whole-ledger reset or general erasure control; additional operator handling may be necessary. Requests use the contact route above.

## Diagnostic logs and platforms

App diagnostics may contain result status, public opportunity IDs and preview titles, post IDs, skip/error reasons and public-feed provenance. These logs are separate from the ledger and are handled through Reddit's Devvit service. The available log-viewing window is not a guarantee about all of Reddit's underlying retention, and ledger cleanup does not establish that platform logs have been erased.

Reddit hosts the app and processes service data under its [privacy policy](https://www.reddit.com/policies/privacy-policy). GitHub supplies the public feed and hosts the policy documents under its [privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Opening a policy link takes the reader to GitHub. The app does not control these platforms' own records.

## Support and external applications

If you voluntarily contact the moderators, your message and Reddit account identity are handled in Reddit modmail and are visible to the community's moderators. Send only what is needed to explain the issue. The app does not automatically read, send or copy that correspondence into its ledger.

Following an employer or application-provider link leaves Reddit. Those sites may collect personal information and documents under their own policies. The bot does not receive applications or CVs entered there. Questions about information submitted to an employer or provider should also be directed to that provider. Source/link review is not a certification of those systems' security or authenticated application journeys.

Material changes to this notice will be published with an updated effective date.
