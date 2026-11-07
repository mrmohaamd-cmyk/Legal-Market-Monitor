# SaudiLaw Jobs: verified launch requirements

Checked 7 November 2026. **Private preview passed; production is not activated.** The app's private version `0.0.2` remains installed only in r/saudilaw_jobs_dev, with feed checks off, dry run on and posting hard-locked. Reddit's development helper is also installed there. This preparation made no Reddit settings changes, submissions, installations or posts.

## What is actually required

| Item | Evidence and application | State |
|---|---|---|
| Review before r/SaudiLaw installation | Reddit's [quickstart](https://developers.reddit.com/docs/quickstart#launching-your-app) requires review above 200 members. Official CLI `GetSubredditInfoByName` returned **345 subscribers** at `2026-11-07T00:09:28.725Z`. | Required for this community; not established. The small-community development allowance does not apply to r/SaudiLaw. |
| Fetch hostname approval | [HTTP Fetch](https://developers.reddit.com/docs/capabilities/server/http-fetch) uses app-specific domain approval. | `api.github.com` approved. This covers the feed request, not employer links or the whole app. |
| Own terms and privacy URLs | The HTTP Fetch documentation requires both for any app using fetch, including a public feed. | Both fields were freshly verified empty; this is a literal CLI publication blocker. Drafts now exist. |
| External application/source links | [Devvit Rules](https://developers.reddit.com/docs/devvit_rules#be-careful-using-external-sites-or-services) require permission during app review for off-platform navigation. | Treat employer links in ordinary text posts as covered; no relevant exception was found. Permission not established. |
| Linked destinations | Devvit Rules assign responsibility for reviewing linked sites that collect personal information. | Employer linkage corroborated for all three. Ordinary browser inspection resolved the initial AllHires notice-fetch failure and verified A&O's privacy links at sign-in. [Recorded review](reddit-application-link-review-2026-11-07.md) retains limits on authenticated applications and security assurance. |
| README, accurate description, support | Devvit Rules require a useful app-root README and accessible support. | README prepared; remote description empty. Propose verified creator identity and existing modmail. No email-only/public-legal-name requirement was found in the reviewed app rules; Reddit can separately request developer information. |
| Privacy/data handling | [Developer Terms sections 7.2–7.3](https://redditinc.com/policies/developer-terms) require accurate disclosure, a deletion-request route and applicable deletion. | Draft describes current preview, future no-expiry dedupe records and manual obligations. A real deletion/reconciliation procedure is still needed before ledger-backed posting. |
| Release testing | [Launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide) asks for stable functionality tested on mobile/web and with relevant account roles. | Backend preview succeeded; visual toast, actual posting/storage integration and mobile/role behavior remain unverified. Game-specific launch screens do not apply to this server-only moderator tool. |

App-review approval, HTTP-domain approval and an unlisted visibility flag are separate facts. The [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) also places moderator tools within Devvit review. Ownership of a subreddit does not waive these requirements.

## Community checks and contact

Read-only moderator UI inspection found: no configured community rules; all post types allowed; no title/link restrictions; blank post guidance and regex requirements; body optional; post flair not required; content-hold switches off; no `config/automoderator` page. These observations are not a promise that Reddit's spam/safety systems will accept every post. New job flair or subreddit-rule changes are optional, not a verified prerequisite.

The community's **Message Mods** link opened a composer addressed to `r/SaudiLaw`; its title/body were blank and no message was sent. Proposed operator: **u/BannedForThe7thTime**, the verified app owner/moderator. Proposed support: **[r/SaudiLaw modmail](https://www.reddit.com/message/compose?to=r/SaudiLaw)**. No new mailbox, company name, public personal email or contact service is needed merely to prepare this proposal. The owner must accept responsibility for that support route.

## Concrete next decision

Adopt the prepared [terms](reddit-terms-draft.md) and [privacy notice](reddit-privacy-draft.md), including the proposed operator and modmail support route, and authorize publishing those approved texts and saving their URLs in app details. This is a policy-adoption/publication decision, not a request for missing credentials or a new email address.

Proposed hosting: a separately authorized documentation-only publication to this existing public GitHub repository, creating `docs/saudilaw-jobs-terms.md` and `docs/saudilaw-jobs-privacy.md` on `main`. Proposed app-detail URLs:

- `https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-terms.md`
- `https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-privacy.md`

No new host or subscription is needed. Those final URLs do **not** exist yet and must not point at drafts. Verify anonymous accessibility and platform acceptance after publication; Reddit's docs require public URLs but do not explicitly preapprove this particular hosting choice. Do not merge all bot code merely to publish two notices.

Then add approved policy/support links to the app's user-facing surfaces (moderator information and any future post footer), finalize destination review and private integration evidence. No code or settings should imply that the current preview already posts jobs.

## Review and later activation sequence

1. Finish the exact release's metadata, notices and evidence. Use the explanation in the [setup packet](reddit-setup-draft.md) to request permission for the listed employer/source destinations; disclose login/collection caveats and the remaining review limits.
2. Obtain specific authorization for the review/publication operation. **Inspected CLI 0.15.2 `publish` creates a new version, uploads a source ZIP, submits review and, for this server-only app without custom posts/payments, attempts immediate UNLISTED visibility.** It is not review-only. There is no review-only/dry-run flag. `--public` would additionally request directory listing and is unnecessary here. Prefer one-time source-upload consent, not its persistent “don't ask again” option.
3. Inspect Reddit's actual review decision and approved external-link use. Do not interpret CLI success or UNLISTED visibility as that permission. Publishing does not upgrade the existing installation; current `dev.subreddit` prevents the first-upload community-creation path.
4. Prepare and test a controlled posting release only with its required test-post/upload approvals. Reconcile storage/deletion behavior, check ordinary-post rendering and relevant mobile/mod/member behavior, and reverify source evidence without merely advancing timestamps. **Submit the changed posting release for review again and obtain approval of that exact release before step 5. Approval of the preview version does not authorize later posting code.** These stages can instead be combined into one final posting-release review after the controlled tests, if that is the approved release plan.
5. Obtain specific authorization to install the approved version in r/SaudiLaw and to activate the agreed posting cadence. Production installation creates persistent access; unattended posting is a separate decision. The code-level lock must be deliberately changed and a schedule added in a reviewed release. Inspect the first authorized post and retain a pause/reconciliation path.

One attempt per UTC day is this prototype's conservative design choice, not a Reddit-mandated quota. Public directory listing, a separate game frontend, a new support mailbox and a paid host are not requirements established for this tool. Reddit currently documents free Devvit hosting; human source review/moderation is still required. No new costs or commitments were made.
