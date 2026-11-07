# Reddit setup packet — draft, not submitted

Private version `0.0.2` is installed in r/saudilaw_jobs_dev after specific owner approval. Its backend preview succeeded with three eligible drafts, five exclusions and no validation errors; visual toast feedback was not captured. Feed checks were restored off, dry run remains on, and zero posts were observed. The app's `api.github.com` fetch domain is approved. General app/off-platform-link approval and public app terms/privacy URLs remain outstanding; the draft policies below are not adopted. Live posting remains hard-locked and unscheduled, with no r/SaudiLaw installation.

## Exact next steps

1. **Completed:** the owner signed in and completed browser registration. Browser inspection verified **Everything** moderator permissions for r/SaudiLaw. The developer portal and authenticated API confirmed ownership of `saudilaw-jobs` and its app account. The account has verified email and accepted developer terms version 2, matching current version 2. No new developer agreement was accepted by the agent.
2. **Completed after specific owner approval:** official Devvit CLI 0.15.2 OAuth, **`scope=*` and `duration=permanent`**, with the actual consent naming Devvit CLI, the verified account and a localhost callback. Login succeeded and `whoami` independently confirmed the same account. Tokens were saved in `~/.devvit/token`; no credential contents were read or copied. This is separate from app installation permissions. Login first calls `Logout()` and can revoke a previous refresh token, clear its file and remove `DEVVIT_AUTH_TOKEN` from the current `.env`; those were absent in the preflight check. Do not rerun login as a diagnostic. An existing session can be checked with `devvit whoami`.
3. **Completed after separate specific approval:** first private upload `0.0.1`, Reddit-created private r/saudilaw_jobs_dev, app installation there, and GitHub HTTP domain-review submission. Browser inspection confirmed `enabled=false`, `dryRun=true`, zero posts, and `api.github.com` **Approved** in Developer Settings. CLI inspection found no installation in r/SaudiLaw. Reddit granted the app account **Everything** moderator permissions and automatically installed Devvit Admin Helper; the optional developer-log-access grant was not changed. The installed app persists after the terminal stops. Its permissions include broad Reddit API services, Redis and HTTP access; they are not posting-only permissions.
4. **Resolved integration issues:** `0.0.1` blocked the private community and failed its UI response because Content-Length was missing. The exact private-community preview allowlist and header correction passed **91 tests**, including an actual HTTP wire regression, plus adapter type-check/schema/build. They are deployed in `0.0.2`; the scheduled path and hard posting lock remain restricted.
5. **Completed after new specific approval:** private `0.0.2` upload, explicit upgrade of the same private installation with unchanged permissions, and one forced preview. Logs at `2026-11-06T23:57:03.559Z` show three candidates, five exclusions, no validation errors and no Content-Length/bridge errors. Visual toast display was not captured. Feed checks were restored off with dry run on, saved and verified after reload; the community still had no posts and the log process was stopped. The prior automatic-review denial is resolved historical context: the initial approval did not cover the changed upload/upgrade, and execution resumed only after the owner explicitly approved them.
6. Adopt the prepared [terms](reddit-terms-draft.md) and [privacy notice](reddit-privacy-draft.md), publish approved copies and save their URLs in app details. The verified creator and existing r/SaudiLaw modmail are proposed below, so a new email address or invented operator name is unnecessary. Finish the [application-link review](reddit-application-link-review-2026-11-07.md). GitHub hostname approval is recorded, but general app review and permission for off-platform application links are not obtained. See the [verified requirements and narrow next decision](reddit-launch-readiness-2026-11-07.md).
7. Backend preview evidence is recorded; visual toast feedback, actual Redis isolation and post rendering remain unverified. Test posts, review submission/publication, installation in r/SaudiLaw, unlocking the posting path and scheduling remain separate future actions. Ending a playtest does not uninstall its last build.

### Completed approved correction and preview

The approved upload and upgrade installed `saudilaw-jobs@0.0.2` only in r/saudilaw_jobs_dev. One moderator preview read verified Git blob `1591d9fb22bbfe2a2e8eeb5b8ad801f09e76d8b3` and returned the same A&O, Segal and White & Case drafts. The version retains the same Reddit API, Redis and `api.github.com` permissions. No new community, r/SaudiLaw installation, post, recurring schedule or additional developer-log grant was added. Final settings are `enabled=false`, `dryRun=true`.

The completed commands were `upload` (which automatically bumped the private version to `0.0.2`) and `install saudilaw_jobs_dev saudilaw-jobs@0.0.2`; upload alone does not upgrade the existing installation. Installation settings are at `https://developers.reddit.com/r/saudilaw_jobs_dev/apps/saudilaw-jobs`; the preview is in the private subreddit's header three-dot menu.

Official references: [authentication and testing FAQ](https://developers.reddit.com/docs/guides/faq), [mod-tool quickstart](https://developers.reddit.com/docs/quickstart/quickstart-mod-tool), [HTTP Fetch](https://developers.reddit.com/docs/capabilities/http-fetch), and [launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide).

## Proposed app description

SaudiLaw Jobs provides moderator-controlled previews of reviewed Saudi legal jobs and training opportunities. **The current build does not publish posts.** It checks a curated public feed and prepares one draft per advertised opportunity, with employer, location, responsibilities, requirements, application link and dated evidence. Standing recruitment routes, closed listings and stale or unverified records are excluded. Unknown work model, pay and deadlines remain unknown. It does not accept applications or guarantee employer availability.

Feed checks are disabled by default. A later approved posting phase would use the app account, conservative rate limits and duplicate-attempt records. An uncertain submission would require moderator review without automatic retries; moderators would handle corrections or withdrawals. Support is proposed through [r/SaudiLaw modmail](https://www.reddit.com/message/compose?to=r/SaudiLaw). This description is prepared, not saved to Reddit.

## Proposed domain and external-link review explanation

Approved fetch hostname: `api.github.com` only, as displayed in the app's Developer Settings after the approved first upload. The server makes an unauthenticated read-only request to the fixed GitHub contents API endpoint for `mrmohaamd-cmyk/Legal-Market-Monitor`, file `dist/opportunities.json`, branch `main`. That branch is the existing human-reviewed publication boundary. Redirects, mismatched file identities, malformed responses and stale evidence are rejected. The application does not add Reddit user data to the request. The bot does not fetch application websites at runtime.

Requested off-platform behavior: link readers directly to the reviewed employer or employer-linked application destination for the advertised opportunity. The bot neither collects nor forwards CVs, account credentials, application answers or applicant contact information. It makes no application submission. Initial destinations are `jobs.aoshearman.com`, `www.segal.com.sa` and `whitecase.grad.allhires.com`; new destinations require reviewed code/feed updates. Source attribution may also link to the corresponding official employer page.

The off-platform explanation is prepared for review, not submitted; GitHub fetch approval is not permission to direct users off-platform. Reddit's [external-site rules](https://developers.reddit.com/docs/devvit_rules#be-careful-using-external-sites-or-services) require an app's own terms/privacy links, verification of linked sites and permission during app review.

## Concrete policy and contact drafts

The separate [terms draft](reddit-terms-draft.md) and [privacy draft](reddit-privacy-draft.md) propose verified creator **u/BannedForThe7thTime** as operator and existing **r/SaudiLaw modmail** for support. The live community's Message Mods link opened a composer addressed to that community; no message was sent. The drafts describe the current preview accurately and separate proposed future posting/storage behavior. They are not adopted, effective or supplied to Reddit as app policies.

The next owner decision is adoption and publication of those exact notices and their support route. Effective dates should be the actual adoption date. Public policy URLs then need saving to app details and adding to user-facing app surfaces. A tested retention/deletion/reconciliation procedure is needed before ledger-backed posting; the current preview writes no ledger. See the [readiness record](reddit-launch-readiness-2026-11-07.md) for the proposed stable hosting and the actual CLI publication side effects.

## Remaining review fields

| Field | Current state |
|---|---|
| Developer account/session | Moderator identity verified; current developer terms accepted; verified email; approved permanent `*` CLI authorization succeeded |
| App registration/name | `saudilaw-jobs` owned by the verified account; private `0.0.2` uploaded and installed |
| Test community | Private r/saudilaw_jobs_dev; feed checks off, dry run on; zero posts observed |
| Terms/privacy URLs | Concrete drafts prepared; adoption/publication and remote URL fields remain pending |
| Operator/support contact | Verified creator and functioning modmail composer proposed; owner adoption pending, no new email needed |
| Application-site privacy/security review | Public employer links and notices reviewed, including AllHires and A&O sign-in privacy links; authenticated applications and backend security are not certified |
| `api.github.com` approval | **Approved**, verified in the app's Developer Settings |
| Permission for off-platform links | Not established |
| Reddit runtime and native rendering | `0.0.2` backend preview succeeded: 3 candidates, 5 exclusions, no validation/bridge errors; visual toast and post rendering unverified |
| Live posting / recurrence | Hard-locked and unscheduled; not authorized by this packet |

These drafts can be reviewed locally without Reddit credentials. The official [HTTP Fetch documentation](https://developers.reddit.com/docs/capabilities/http-fetch) requires policy URLs in app details, and the [Devvit Rules](https://developers.reddit.com/docs/devvit_rules) require accurate policies for fetch use. Private testing is not an exemption from that requirement. Further publication/review must use the adopted notices, not draft placeholders.
