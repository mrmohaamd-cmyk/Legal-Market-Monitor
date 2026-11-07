# Posting-release review packet — draft, not submitted

Prepared 7 November 2026. The hosted app is still private 0.0.3, with posting off. The changed local candidate implements posting but both release gates are false. The last official status inspection, at `2026-11-07T01:29:13.873Z`, found zero review records. No later submission, upload, install, post or activation was performed. This packet is not evidence of Reddit approval.

## Proposed description

SaudiLaw Jobs publishes one text post per human-reviewed, currently advertised Saudi legal opportunity. It includes employer, location, role details, requirements, source dates and the application link; unknown details stay unknown. Moderator controls preview, start/stop, recover uncertain results and remove app-owned posts. Applications are handled by the named employer's site, never by this app.

Use that description only for a release that actually permits and has verified posting. For the current locked candidate, explicitly prepend: "Posting implementation prepared for private testing; live posting remains disabled." The remote description was last observed empty; it has not been edited in this preparation.

## Required evidence and remaining gaps

| Area | Evidence now | Still required before a confident posting submission |
|---|---|---|
| Understandable app/README | App-root README describes every control, source, setting and uncertainty behavior. | Upload the exact final source and match the app description to that release. [Devvit Rules](https://developers.reddit.com/docs/devvit_rules#app-readme-requirements). |
| Mobile/web and roles | Previous private release passed desktop moderator information menus. Local tests deny ordinary-member mutations and foreign-community calls. | Actual new controls on desktop/mobile and ordinary-member sessions. Server mocks and responsive resizing do not establish these. The [launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide) explicitly asks for mobile/web and developer/moderator/regular-user testing; no documented waiver is claimed. |
| Actual posting and Redis | Local CAS, concurrent submissions, receipt failure, reconciliation, deletion and lifecycle tests pass. | One authorized synthetic APP post, its independent readback and stored receipt; verify hosted transaction behavior. A private fixture does not prove employer-link UX or every network failure. [Test plan](reddit-private-posting-test-plan.md). |
| Retention/deletion | Ledger keeps no post content or moderator identities; cleanup, suppression and retryable deletion handling implemented. | Adopt accurate notices; verify hosted delete-event delivery and cleanup. Hashes are metadata, not anonymization. [Proposed privacy notice](reddit-posting-privacy-draft.md). |
| Policies/contact | Adopted terms/privacy are published and saved; exact links and blank modmail composer passed desktop checks on 0.0.3. | Adopt/publish posting revisions with the same verified operator/support, then recheck URLs and user-visible access. No new personal email is asserted mandatory. [Rules](https://developers.reddit.com/docs/devvit_rules), [HTTP Fetch terms](https://developers.reddit.com/docs/capabilities/server/http-fetch#terms-and-conditions). |
| Least capability | Reddit API authorizes moderators and submits/reads/deletes APP posts; Redis holds claims/schedule state; scheduler supports explicit starts; `api.github.com` serves a fixed reviewed feed. | Disclose the added `onPostDelete` trigger in the next private-version approval. Existing API/storage category approvals do not make this the same capability set as 0.0.3. No install/startup cron, user impersonation, payments or OAuth provider added. [Configuration guidance](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_configuration#best-practices). |
| Off-platform links | GitHub fetch host approved; public employer/application destination review recorded. | Explicit review permission for navigation links; authenticated application/security flows remain unverified. Fetch allowlisting does not approve navigation. [Devvit Rules](https://developers.reddit.com/docs/devvit_rules), [destination review](reddit-application-link-review-2026-11-07.md). |
| Live usefulness/correctness | Source, editorial and application evidence each expire after seven days; evergreen, stale, closed and uncertain records are excluded. | Fresh evidence at launch. Review dates are never renewed by a successful feed download. Real employer post rendering remains distinct from the synthetic test. |
| Scheduling and production | Local tests cover matching/stale callbacks, concurrent Start/Stop and daily caps. Source gates and defaults are disabled; no automatic cron exists. | Separately approved schedule integration and production installation/cadence. Proposed 09:00 Saudi daily schedule is not active. A human-requested post already in flight cannot be recalled by Stop. |

## Proposed link-permission explanation

Request permission for public GitHub policy links and the exact employer/application routes used by reviewed records: `careers.aoshearman.com`, `jobs.aoshearman.com`, `www.segal.com.sa`, `www.whitecase.com`, and `whitecase.grad.allhires.com`. These provide evidence or the employer's own application path. The bot does not operate those sites, collect applications, receive application fees or certify their security. Policy/support links are fixed; application links must match the reviewed registry. This text is a prepared explanation only, not a request already sent to Reddit.

## Submission and launch boundaries

The inspected CLI 0.15.2 `publish` uploads a new version and source, submits review, and may attempt UNLISTED visibility. It is not a review-only action. It does not upgrade existing installations. The approved earlier review request was paused before execution; do not reuse it to submit this materially changed release. Unlisted visibility never substitutes for Reddit review or off-platform permission.

The immediate next decision is the concrete private test build and one synthetic post, including explicit new-ledger initialization and the added deletion-event capability. Specify author deletion of that exact disposable post separately if included. Reuse existing developer/private-community access; do not create accounts or widen access implicitly. After integration and policy adoption, obtain authorization for the exact review submission. Production installation, fresh-source validation and activation/cadence remain later decisions.

No paid service is required by the prepared architecture. Devvit's [server overview](https://developers.reddit.com/docs/capabilities/server/overview) describes included hosting/storage; no paid commitment or new credential was created. Ongoing source review and moderation remain human work. Reddit's approval timing and acceptance are not guaranteed.
