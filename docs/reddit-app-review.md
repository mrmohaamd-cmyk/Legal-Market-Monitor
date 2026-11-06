# Reddit jobs app: review and launch notes

Status: private version `0.0.1` is installed only in r/saudilaw_jobs_dev after specific owner approval, with feed checks off, dry run on and live posting hard-locked. Zero posts were observed and CLI inspection found no r/SaudiLaw installation. GitHub fetch-domain approval is confirmed; general app/off-platform-link approval is not. Official documentation was reviewed in November 2026. Later uploads/upgrades, publication, live installation and posting need their applicable specific authorization; no paid commitment is authorized.

## Platform choice

Devvit can run a server-only community app with scheduled tasks and ordinary text posts. Use `@devvit/web/server` and `devvit.json`; the legacy Blocks/public-api approach is deprecated in 0.15. The server bundle must be CommonJS. The configuration schema is authoritative, and dependency versions should remain pinned and tested. See [app configuration](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_configuration) and the [configuration schema](https://developers.reddit.com/schema/config-file.v1.json).

`reddit.submitPost()` with `text` creates a normal text post. Set `runAs: 'APP'` explicitly; app-account attribution is also the default. The bot does not need permission to impersonate the installing moderator. Automated posting as a human account is incompatible with the explicit-manual-action requirement for user actions. See [RedditClient](https://developers.reddit.com/docs/api/redditapi/RedditClient/classes/RedditClient), [user actions](https://developers.reddit.com/docs/capabilities/server/userActions), and the [FAQ](https://developers.reddit.com/docs/guides/faq).

Keep `enabled` false and `dryRun` true by default. Missing, malformed or unreadable settings must fail closed. Installation settings are read through `settings.get()` inside the request context and can be changed by installation moderators. Destination selection must use the trusted installation context and an explicit subreddit allowlist, not a request parameter. See [settings and secrets](https://developers.reddit.com/docs/capabilities/server/settings-and-secrets).

Declare the scheduler endpoint without a `cron` value in the prepared configuration. This registers a task type without scheduling recurring work. After approval and testing, a separate reviewed change may add a conservative cadence. Devvit supports ten live recurring actions per installation and limits `runJob()` creation and delivery rates to sixty per minute. See [scheduler](https://developers.reddit.com/docs/capabilities/server/scheduler).

## Feed and external links

The fetch permission is `api.github.com`, restricted in code to this repository's public reviewed feed. The app's Developer Settings page showed this hostname **Approved** after the authorized first upload. This is app-specific fetch approval, not general app review or permission for off-platform application links. GitHub's documented contents API is preferable to assuming permission for arbitrary raw-file or personal hosting domains. Avoid automatic redirects to an unapproved hostname.

Reddit requires exact hostnames, HTTPS, and a README section named **Fetch Domains** describing each requested domain. Current HTTP Fetch policy ordinarily approves documented public APIs, while personal domains need an exception. Requests are app-specific even for globally allowed domains; the stated normal domain-review window is one to two business days, with no guarantee. The fetch timeout is thirty seconds. See [HTTP Fetch and domain policy](https://developers.reddit.com/docs/capabilities/http-fetch).

The app must have its own accurate terms and privacy policy, linked in app details and the app. These cannot simply be links to Reddit's policies. App review must specifically approve directing users off Reddit. Application sites that collect personal information need legitimacy, security and privacy-policy checks. This is relevant even when the bot itself collects no applications. Do not assume an HTTP 200 response establishes a genuine open vacancy or a trustworthy employer. See [Devvit Rules: external sites and services](https://developers.reddit.com/docs/devvit_rules#be-careful-using-external-sites-or-services).

The feed publisher remains responsible for vacancy evidence. A published record with a recent verification date can still describe an evergreen application route. Require an explicit advertised-opportunity classification, current evidence, an unexpired deadline when supplied, and reviewed source/application URLs. Keep missing work model, salary, requirements or deadline visibly unknown. A bot should not infer these facts from an employer's general careers page or fill them with generated text.

Runtime feed retrieval and application-link validation are different operations. Adding employer hosts for live checks would require additional fetch permissions and an implementation review. Until then, use recorded human review evidence and clearly disclose that the app does not continuously inspect every employer page. A successful feed download cannot prove all linked vacancies remain open.

## Duplicate prevention and uncertain outcomes

Devvit handlers may run concurrently. Its Redis data is scoped to each subreddit installation. Official guidance recommends transactions for read/check/write operations; use `watch`, read, `multi`, write and `exec`, handling a `null` result as contention and cleaning up early exits. Storage operations can fail. See [Redis](https://developers.reddit.com/docs/capabilities/server/redis).

This prototype uses single-command atomic `SET NX` claims for the UTC day, record ID and normalized vacancy identity. The claims are deliberately sequential: partial writes stop the attempt and retain all successfully written claims. No read/check/write sequence alone authorizes a post, and no claim expires. This favors missed posts over duplication without depending on a transaction across Reddit and Redis.

The safety design is at-most-once submission attempts with durable reconciliation, not a claim of exactly-once delivery. Claim a canonical vacancy before calling Reddit. A timeout may mean a post was created even when no response arrived; a successful post followed by a failed ledger write has the same ambiguity. Preserve a pending/uncertain record and stop retries. Do not expire that claim and repost automatically. Resolve it by inspecting the destination and recording the existing post ID, or by a deliberate moderator decision after proving no post exists. Preserve tombstones for removed or previously handled listings so routine feed refreshes cannot recreate them.

## Rules and review

The review submission must include a useful root README describing operation, settings and all capabilities. Reddit may inspect source and test the app. Respect third-party content rights; use original presentation and no copied bot branding or logos. The external-link approval described above is a real launch dependency, not an optional disclosure. See [Devvit Rules](https://developers.reddit.com/docs/devvit_rules).

Apps must register transparently, limit access to their stated purpose, avoid manipulative engagement, and not send unsolicited private messages. Owning or moderating the subreddit does not exempt an app from platform requirements. See [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy).

Repeated unwanted automated activity and deceptive redirects can be spam. Use a conservative posting limit, duplicate prevention and a clear automated-source footer. Keep activity confined to the approved community; do not crosspost identical jobs elsewhere automatically. See [Reddit spam guidance](https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community).

## Setup boundaries and remaining steps

Local schema checks, fixture tests, dry runs, type checks and builds do not need Reddit credentials. They do not establish successful Devvit runtime operation or Reddit approval. The official quickstart currently recommends Node.js 24.18.0 or newer. See [mod-tool quickstart](https://developers.reddit.com/docs/quickstart/quickstart-mod-tool).

Registration, the specifically approved permanent full-scope developer CLI authorization, and the first private upload/installation are complete. The private installation has broad Reddit API/Redis/HTTP capabilities; Reddit gave the app account **Everything** moderator permissions and automatically installed Devvit Admin Helper. The optional developer-log grant was unchanged. These facts do not establish successful preview execution or app-review approval.

The following are remaining steps, not instructions to run as part of the prototype's local test command:

1. Review the corrected code and source classifications; confirm production posting rules and optional job flair. The claimed app name is `saudilaw-jobs` and the private test community is r/saudilaw_jobs_dev.
2. Obtain specific approval to upload private `0.0.2`, upgrade the same private installation and run the forced moderator preview with unchanged permissions. The first menu reached the server but was blocked by the private-community guard, then failed its UI response due to missing `Content-Length`. Both corrections are local and not redeployed. Automatic approval review rejected the second upload before execution because initial approval did not clearly cover the changed version/separate upgrade; it was not retried. Keep dry run on, temporarily enable feed checks only for the test, and restore them off. See the [concrete setup proposal](reddit-setup-draft.md).
3. Finalize a public terms document, privacy policy and support contact; explain the exact public feed, stored ledger metadata, retention and external application links. Policy URLs remain absent. GitHub fetch approval is complete; general app/off-platform-link review remains outstanding.
4. Record successful private-community runtime/UI evidence before a posting proposal. Keep production posting disabled and obtain separate explicit approval for test posts. Local tests already cover overlapping runs, uncertain submissions, settings failures and malformed feeds; actual Redis isolation, app-account output and mobile/web post rendering remain integration work.
5. Approve app-review submission after the necessary evidence and policies are complete. `devvit upload` creates a private version; it does not replace general review. `devvit publish` submits a version for review. Unlisted is the appropriate default for this single-community tool; `--public` requests directory listing. See [launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide).
6. After Reddit approval, obtain authorization to install the approved version in r/SaudiLaw and enable live posting/cadence. Confirm settings and the first actual post, then monitor skip/error/uncertain states. Installation/update is separate from publication. Ending a playtest leaves its final build installed; explicitly manage that installation. See the [FAQ](https://developers.reddit.com/docs/guides/faq).

App review timing is not guaranteed. The launch guide targets one to two business days for many versions; Devvit Rules mentions approximately one week for a complete submission. New apps and fetch-related policy questions can take longer.

## Costs and exact production blockers

Reddit's quickstart says Devvit hosting is free; its [server overview](https://developers.reddit.com/docs/capabilities/server/overview) also describes included backend/Redis hosting. This design does not inherently need a paid host, paid model, paid scraper or external credential. Human source review and moderation still require ongoing effort. No purchase or payment commitment is part of this prototype.

Production remains blocked on successful corrected private-community runtime testing; general app and off-platform-link approval; finished terms/privacy/contact details; verified source review coverage; confirmed production settings/rules; and specific authorization for production installation, posting and cadence. Registration, developer CLI authorization, the first private installation and GitHub fetch-domain approval are complete. The local fixes still require an approved upload and upgrade; a passing local suite cannot establish their deployed behavior.
