# SaudiLaw Jobs

SaudiLaw Jobs prepares one Reddit post per verified Saudi legal job or training opportunity. It includes the employer, location, work model when stated, role details, requirements, source evidence and application link. Standing recruitment routes are never presented as vacancies. The app does not accept applications or CVs.

**Current candidate: posting is locked, not deployed or submitted for review.** The implemented posting, recovery and scheduler controls are prepared for supervised private integration tests. Defaults remain feed checks off, production preview-only on, private test off and no active schedule. Installed private version 0.0.3 remains unchanged. This candidate is not a claim of completed Reddit posting tests or Reddit approval.

Operator: [u/BannedForThe7thTime](https://www.reddit.com/user/BannedForThe7thTime/). Support, corrections and deletion requests: [r/SaudiLaw modmail](https://www.reddit.com/message/compose?to=r/SaudiLaw).

[Adopted terms](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-terms.md) | [Adopted privacy notice](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-privacy.md). These describe the deployed preview. Proposed posting-specific disclosures require adoption before a posting release is submitted; they are not silently substituted here.

## Moderator controls

All mutating menus and form submissions independently check the caller's post-moderation permission in this exact community. Member-visible About, Terms, Privacy and Contact menus provide fixed policy/support links. Contact opens a blank Reddit composer and sends nothing.

- **Preview SaudiLaw jobs:** inspect eligible/excluded counts with no post or ledger writes. Enable feed checks to run it; production preview-only can stay on.
- **Job bot status:** inspect the schedule, any unresolved attempt and the latest ten receipts.
- **Initialize posting ledger:** first-time setup only, with explicit confirmation that neither prior posting nor lost storage exists. It never replaces an existing ledger. Do not use it after storage loss.
- **Publish next verified job:** confirm one unclaimed eligible job. The displayed draft fingerprint is rechecked before submission; changed or expired evidence is rejected.
- **Start daily jobs:** after a separately approved production release, enable checks and turn production preview-only off, then explicitly confirm checks at 09:00 Saudi time (06:00 UTC). It does not post immediately. At most one attempt is allowed per UTC day.
- **Stop daily jobs:** persist a stop before cancelling callbacks. A newer Start has a different generation. An already-submitted request cannot be recalled; uncertain stop results require inspecting status and disabling feed checks.
- **Reconcile bot post:** record an existing post only after independently verifying its exact ID, app author, community and unique attempt reference. No post is created. Absence or elapsed time never permits a retry.
- **Cancel reserved attempt:** cancel work that has not entered submission. Its opportunity and daily claims remain consumed. Submitted/uncertain work cannot be cleared this way.
- **Remove bot post:** explicitly confirm permanent author deletion of one verified app post. A suppression tombstone is committed first. An API acknowledgement alone does not prove deletion; verify the post afterward.
- **Private posting test:** after separate deployment/test authorization, one fixed synthetic NOT A JOB post in r/saudilaw_jobs_dev. It uses no feed, employer details or application link, and has a separate permanent one-use claim. This setting never permits production posts or a schedule.

Posting remains locked until the appropriate source-controlled release permission is approved. Request bodies and installation settings cannot unlock it. The only supported communities are r/SaudiLaw and the exact private test community.

## Safety, data and recovery

The public, human-reviewed main branch of mrmohaamd-cmyk/Legal-Market-Monitor supplies the feed. Source, application and editorial evidence must each be less than 168 hours old. Closed, uncertain, stale, malformed and unregistered records are withheld. Missing salary, deadlines and work model remain unknown. Downloading the feed does not recheck an employer's live site.

An atomic installation-scoped ledger reserves the day and hashed opportunity identities before submitting as the app. An unresolved attempt pauses all later posting, even for another job or day. A timeout may occur after Reddit creates a post; the app never automatically retries it. Recovery requires positive matching evidence. Deleted or suppressed opportunities are not automatically reposted. Capacity limits and corrupt/missing storage fail closed.

The ledger stores hashes, attempt states/times and post receipts/tombstones, not Reddit post bodies, titles, URLs, applicant details or moderator profiles. Moderator identities and nominated posts are read transiently for authorization and recovery. Scheduler state stores tokens and job IDs. Deletion/removal events scrub tracked raw post IDs; no event content is retained. Unknown failures remain explicit, with retryable cleanup separated from non-retryable submissions.

Reddit API, Redis, scheduler and deletion-trigger capabilities support these controls. The sole fetch host is approved api.github.com: a fixed unauthenticated repository-contents GET, bounded by size, deadline and Git blob validation. No payments, account linking, advertising or analytics integration is included.

## Review scope and evidence

The intended posting release must explicitly request permission for GitHub policy navigation and employer/application links: careers.aoshearman.com, jobs.aoshearman.com, www.segal.com.sa, www.whitecase.com and whitecase.grad.allhires.com. Fetch approval is not external-navigation approval. Public destinations have been reviewed, but authenticated application flows and backend security are not certified. Any changed posting release requires Reddit review; an UNLISTED flag is not approval.

Local tests cover concurrent claims, ambiguous submission/receipt writes, positive recovery, deletion races, role checks, scheduler lifecycle and fixed private-test isolation. Desktop menus on installed 0.0.3 passed; its predecessor completed an enabled feed preview. The newly implemented controls, real Redis transaction behavior, actual posting/deletion, mobile and ordinary-member sessions still require integration evidence. See the repository's private posting test plan and review-readiness audit. No test/build command deploys or activates the app.

