# Reddit setup packet — draft, not submitted

Private version `0.0.1` is installed in r/saudilaw_jobs_dev after specific owner approval. Feed checks are off, dry run is on, and zero posts were observed. The app's `api.github.com` fetch domain is approved. General app/off-platform-link approval and public app terms/privacy URLs remain outstanding; the draft policies below are not adopted. Live posting remains hard-locked and unscheduled, with no r/SaudiLaw installation.

## Exact next steps

1. **Completed:** the owner signed in and completed browser registration. Browser inspection verified **Everything** moderator permissions for r/SaudiLaw. The developer portal and authenticated API confirmed ownership of `saudilaw-jobs` and its app account. The account has verified email and accepted developer terms version 2, matching current version 2. No new developer agreement was accepted by the agent.
2. **Completed after specific owner approval:** official Devvit CLI 0.15.2 OAuth, **`scope=*` and `duration=permanent`**, with the actual consent naming Devvit CLI, the verified account and a localhost callback. Login succeeded and `whoami` independently confirmed the same account. Tokens were saved in `~/.devvit/token`; no credential contents were read or copied. This is separate from app installation permissions. Login first calls `Logout()` and can revoke a previous refresh token, clear its file and remove `DEVVIT_AUTH_TOKEN` from the current `.env`; those were absent in the preflight check. Do not rerun login as a diagnostic. An existing session can be checked with `devvit whoami`.
3. **Completed after separate specific approval:** first private upload `0.0.1`, Reddit-created private r/saudilaw_jobs_dev, app installation there, and GitHub HTTP domain-review submission. Browser inspection confirmed `enabled=false`, `dryRun=true`, zero posts, and `api.github.com` **Approved** in Developer Settings. CLI inspection found no installation in r/SaudiLaw. Reddit granted the app account **Everything** moderator permissions and automatically installed Devvit Admin Helper; the optional developer-log-access grant was not changed. The installed app persists after the terminal stops. Its permissions include broad Reddit API services, Redis and HTTP access; they are not posting-only permissions.
4. **Integration finding:** the installed menu reached the server, which blocked the private community because `0.0.1` accepts only r/SaudiLaw. Its UI response then failed because `Content-Length` was missing. The exact private-community preview allowlist and header correction are complete locally: **91 tests pass**, including an actual HTTP wire regression, and the adapter type-check/schema/build passes. Deployment remains pending; the scheduled path and hard posting lock remain restricted.
5. **Next approval boundary:** upload those reviewed fixes as private `0.0.2`, then explicitly upgrade the same private installation and run its forced preview. A second upload attempt was denied before execution by automatic approval review: the initial approval did not clearly authorize a changed version, and the installed app requires a separate upgrade. The denial was checked against the user's initial approval and the action was not retried. No replacement version has been uploaded or installed.
6. Finalize the draft notices below, supply owner/contact/public policy URLs, and review the external application sites' privacy/security details. GitHub hostname approval is recorded, but general app review and permission for off-platform application links are not obtained.
7. After the private preview is authorized and passes, record its runtime and UI evidence. Test posts, review submission/publication, installation in r/SaudiLaw, unlocking the posting path and scheduling remain separate future actions. Ending a playtest does not uninstall its last build.

### Concrete action prepared for approval

Upload the reviewed local fixes as private `saudilaw-jobs@0.0.2`; upgrade only the existing installation in r/saudilaw_jobs_dev; keep dry run on, temporarily enable feed checks there, invoke **Preview SaudiLaw jobs**, inspect the toast/logs and restore feed checks off. The version keeps the same Reddit API, Redis and `api.github.com` HTTP permissions. It creates no new community, r/SaudiLaw installation, post or recurring schedule. No additional developer-log grant is requested.

After that specific approval, use the already installed CLI from `reddit-bot/` for `upload --version 0.0.2`, then `install saudilaw_jobs_dev saudilaw-jobs@0.0.2`. Verify the installed version with `list installs saudilaw_jobs_dev`. The upload alone does not upgrade the existing installation. Installation settings are at `https://developers.reddit.com/r/saudilaw_jobs_dev/apps/saudilaw-jobs`; the preview is in the private subreddit's header three-dot menu.

Official references: [authentication and testing FAQ](https://developers.reddit.com/docs/guides/faq), [mod-tool quickstart](https://developers.reddit.com/docs/quickstart/quickstart-mod-tool), [HTTP Fetch](https://developers.reddit.com/docs/capabilities/http-fetch), and [launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide).

## Proposed app description

SaudiLaw Jobs prepares clear summaries of reviewed Saudi legal jobs and training programmes for r/SaudiLaw. Each advertised opportunity becomes one text post with the employer, location, responsibilities, requirements, official application link and dated source evidence. Standing recruitment routes, closed listings and stale or unverified records are excluded. Unknown work model, pay and deadlines remain unknown. It does not accept applications or guarantee employer availability.

The initial build is disabled and restricted to dry runs. Any later posting phase uses the app account, conservative rate limits and permanent duplicate-attempt records. An uncertain submission requires moderator review; it is not automatically retried. Posts are snapshots, so moderators handle corrections or withdrawals after publication.

## Proposed domain and external-link review explanation

Approved fetch hostname: `api.github.com` only, as displayed in the app's Developer Settings after the approved first upload. The server makes an unauthenticated read-only request to the fixed GitHub contents API endpoint for `mrmohaamd-cmyk/Legal-Market-Monitor`, file `dist/opportunities.json`, branch `main`. That branch is the existing human-reviewed publication boundary. Redirects, mismatched file identities, malformed responses and stale evidence are rejected. The application does not add Reddit user data to the request. The bot does not fetch application websites at runtime.

Requested off-platform behavior: link readers directly to the reviewed employer or employer-linked application destination for the advertised opportunity. The bot neither collects nor forwards CVs, account credentials, application answers or applicant contact information. It makes no application submission. Initial destinations are `jobs.aoshearman.com`, `www.segal.com.sa` and `whitecase.grad.allhires.com`; new destinations require reviewed code/feed updates. Source attribution may also link to the corresponding official employer page.

The off-platform explanation is prepared for review, not submitted; GitHub fetch approval is not permission to direct users off-platform. Reddit's [external-site rules](https://developers.reddit.com/docs/devvit_rules#be-careful-using-external-sites-or-services) require an app's own terms/privacy links, verification of linked sites and permission during app review.

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
| Developer account/session | Moderator identity verified; current developer terms accepted; verified email; approved permanent `*` CLI authorization succeeded |
| App registration/name | `saudilaw-jobs` owned by the verified account; private `0.0.1` uploaded and installed |
| Test community | Private r/saudilaw_jobs_dev; feed checks off, dry run on; zero posts observed |
| Terms/privacy URLs | Not supplied or published |
| Operator/support contact | Must be supplied or confirmed |
| Application-site privacy/security review | Needs a recorded review of each actual destination |
| `api.github.com` approval | **Approved**, verified in the app's Developer Settings |
| Permission for off-platform links | Not established |
| Reddit runtime and native rendering | `0.0.1` menu reached server; private-context guard and missing Content-Length prevented successful preview; local fixes await approved upload/upgrade |
| Live posting / recurrence | Hard-locked and unscheduled; not authorized by this packet |

These drafts can be reviewed locally without Reddit credentials. They do not need to be published merely to continue local tests. The official [HTTP Fetch documentation](https://developers.reddit.com/docs/capabilities/http-fetch) says policy URLs belong in app details, and the [Devvit Rules](https://developers.reddit.com/docs/devvit_rules) require accurate policies for fetch use. Final adoption and public hosting should follow the actual owner and service details, rather than placeholders.
