# Reddit setup packet — draft, not submitted

Prepared for the next setup phase. Nothing in this document establishes Reddit approval, a registered app, an installation, a valid developer session or an adopted legal policy. The existing live-posting code lock and absent schedule remain unchanged.

## Exact next steps

1. The browser inspection found `developers.reddit.com` signed out. Its login control opened Reddit's sign-in form, but no moderator account was authenticated. The official Devvit CLI 0.15.2 was then installed in a separate local task-workspace tools directory, without lifecycle scripts or a global PATH change. Its version command succeeded; `~/.devvit/token` remained absent. No credential contents were read. The next required user action is to sign in there with the account that moderates r/SaudiLaw. Do not select an unidentified Google account, create another Reddit account, or treat reaching the login form as completed sign-in.
2. After sign-in, inspect the account, available apps and r/SaudiLaw moderator controls without changing access. Inspect any subsequent developer-registration or authorization screen and obtain confirmation for that specific persistent grant before accepting it. Devvit CLI login stores a token in `~/.devvit/token` and refreshes it automatically. A broad request to continue setup is not a substitute for the required action-specific access confirmation in this task. If an existing authorized CLI session is later found, `devvit whoami` is an account check; do not print or copy its token.
3. Verify whether the proposed app name `saudilaw-jobs` is available and whether the owner already has a suitable private test community. Do not create an app, community or installation while their required access confirmation remains outstanding.
4. Before an approved playtest, prepare a reviewed test-target configuration and verify the manual moderator dry-run entry point. The current setup work adds that entry point while preserving the r/SaudiLaw-only destination gate; a concrete private test target still needs a separate reviewed change. Keep the hard posting lock active for this phase.
5. Finalize the draft notices below, supply the missing owner/contact/public policy URLs, and review the external application sites' privacy/security details. Upload/playtest with HTTP domains initiates domain requests; do not describe it as a local-only test.
6. With approval for the concrete upload/test installation, run a private-community dry run and inspect platform logs, settings, scoped storage behavior and rendering. Test posts remain a distinct authorized action; a dry-run installation is not permission to post. Ending a playtest does not uninstall its last build.
7. Submit the specific feed-domain and off-platform application-link use case for Reddit review. Record the actual decision. Publication, installation in r/SaudiLaw, unlocking the posting path and scheduling are separate future actions.

Official references: [authentication and testing FAQ](https://developers.reddit.com/docs/guides/faq), [mod-tool quickstart](https://developers.reddit.com/docs/quickstart/quickstart-mod-tool), [HTTP Fetch](https://developers.reddit.com/docs/capabilities/http-fetch), and [launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide).

## Proposed app description

SaudiLaw Jobs prepares clear summaries of reviewed Saudi legal jobs and training programmes for r/SaudiLaw. Each advertised opportunity becomes one text post with the employer, location, responsibilities, requirements, official application link and dated source evidence. Standing recruitment routes, closed listings and stale or unverified records are excluded. Unknown work model, pay and deadlines remain unknown. It does not accept applications or guarantee employer availability.

The initial build is disabled and restricted to dry runs. Any later posting phase uses the app account, conservative rate limits and permanent duplicate-attempt records. An uncertain submission requires moderator review; it is not automatically retried. Posts are snapshots, so moderators handle corrections or withdrawals after publication.

## Proposed domain and external-link review explanation

Requested fetch hostname: `api.github.com` only. The server makes an unauthenticated read-only request to the fixed GitHub contents API endpoint for `mrmohaamd-cmyk/Legal-Market-Monitor`, file `dist/opportunities.json`, branch `main`. That branch is the existing human-reviewed publication boundary. Redirects, mismatched file identities, malformed responses and stale evidence are rejected. No Reddit user data is sent to GitHub. The bot does not fetch application websites at runtime.

Requested off-platform behavior: link readers directly to the reviewed employer or employer-linked application destination for the advertised opportunity. The bot neither collects nor forwards CVs, account credentials, application answers or applicant contact information. It makes no application submission. Initial destinations are `jobs.aoshearman.com`, `www.segal.com.sa` and `whitecase.grad.allhires.com`; new destinations require reviewed code/feed updates. Source attribution may also link to the corresponding official employer page.

This explanation is prepared for review, not submitted, and is not permission to direct users off-platform. Reddit's [external-site rules](https://developers.reddit.com/docs/devvit_rules#be-careful-using-external-sites-or-services) require an app's own terms/privacy links, verification of linked sites and permission during app review.

## Draft user notice / terms content

**Owner input required:** operator name, support contact, effective date and public policy URLs. This draft is not yet a published or adopted policy.

SaudiLaw Jobs is an independent information service operated by **[operator]** for r/SaudiLaw. It summarizes reviewed advertised opportunities and links to the original source. Employers control their recruitment, eligibility, deadlines and application decisions. Information may change after the displayed verification time. Readers should check the official employer page before applying.

The bot does not recruit candidates, accept applications or provide a guarantee of a job, interview or admission to a programme. Applying through an external site is a separate interaction with that employer or application provider, under that site's terms and privacy information. Do not send CVs, identity documents, passwords or other application information to the bot.

For corrections, suspected misleading links or support, contact **[support contact]**, identifying the post or its reference ID. The operator may correct, withdraw or stop publishing listings. Community participation remains subject to r/SaudiLaw's rules and Reddit's terms.

## Draft privacy content

**Owner input required:** operator/contact, effective date, final retention/removal procedure, and confirmation of platform-provided log handling. This text describes inspected application behavior, not a claim that the hosting platforms process no data.

The application reads public job records from the named GitHub repository. It uses the subreddit name and installation settings supplied by Reddit to limit operation to the approved community. It does not intentionally retain applicant information, Reddit usernames, user posts/comments, CVs or application answers. It has no application form, user account-linking feature, analytics service or advertising integration.

In a future approved posting phase, its Reddit-hosted ledger records job/reference IDs, normalized employer/role/location identities, attempt date/state and the bot's returned Reddit post IDs to prevent duplicate posting. The current code sets no expiry on this ledger. An approved retention and reconciliation procedure must preserve enough history to prevent reposting; no automatic deletion or reset tool is included. During dry runs, the core does not write the posting ledger.

Operational logs include result status, errors/skip reasons, public job IDs and public-feed provenance. The application does not add applicant or viewer data to its GitHub feed request. Reddit and GitHub may process service-level data under their own policies; the operator must confirm the platform controls before making any promise about their retention.

Following an application link takes the reader to an external employer/provider. Information entered there is handled by that site; the bot does not receive it. Review the destination's privacy information before applying. Questions about this bot's handling of information go to **[support contact]**. Requests about an employer application go to that employer/provider.

## Remaining review fields

| Field | Current state |
|---|---|
| Developer account/session | Browser signed out; login form reached. Local Devvit CLI 0.15.2 prepared and version-tested; token file remains absent |
| App registration/name | Proposed `saudilaw-jobs`; availability/ownership unverified |
| Test community | No concrete approved target recorded |
| Terms/privacy URLs | Not supplied or published |
| Operator/support contact | Must be supplied or confirmed |
| Application-site privacy/security review | Needs a recorded review of each actual destination |
| `api.github.com` approval | Not established |
| Permission for off-platform links | Not established |
| Reddit runtime and native rendering | Not yet tested |
| Live posting / recurrence | Hard-locked and unscheduled; not authorized by this packet |

These drafts can be reviewed locally without Reddit credentials. They do not need to be published merely to continue local tests. The official [HTTP Fetch documentation](https://developers.reddit.com/docs/capabilities/http-fetch) says policy URLs belong in app details, and the [Devvit Rules](https://developers.reddit.com/docs/devvit_rules) require accurate policies for fetch use. Final adoption and public hosting should follow the actual owner and service details, rather than placeholders.
