# Saudi Elite Legal Opportunities

A public static page for curated Saudi early-career legal opportunities. The canonical public deployment is GitHub Pages, built directly from this repository's `main` branch. A separate private GitHub Actions monitor checks official sources and maintains a review report. This repository also prepares a draft publication PR from conservative first-party rechecks. Neither workflow merges or publishes listings automatically. No application server, database, accounts, API keys or analytics are used in production.

## Brand premise

This is not a law-firm site and should not simulate one. It is an independent monitor for ambitious early-career candidates. Its authority comes from visible provenance, a tightly defined Saudi-only scope, current-status handling and direct official routes—not prestige claims or decorative luxury. Retain the editorial hierarchy, source/fact distinction and calm, task-led interaction when maintaining the page.

## Opportunity feed

`dist/opportunities.json` is the publication record for the visible explorer. Every entry must use a reachable first-party source, preserve unknown deadlines and eligibility as unknown, and keep sourced facts separate from editorial assessment. `last_verified_at` is evaluated in the browser against `verification_window_hours`; overdue records are downgraded to “Verification due” instead of remaining labelled verified open. Passed deadlines and records explicitly marked closed or expired are suppressed from the current list.

To refresh the feed, recheck each source, update its record and verification timestamp, run validation, and publish. Do not advance a timestamp without actually checking the official source. A standing or “general opportunity” must be described as such and must not be presented as confirmed immediate headcount.

Each record also carries `record_kind` (`advertised_opening` or `recruitment_route`), `last_reviewed_at` and a dated `application_check`. A failed or incomplete availability check uses `verification_pending` and retains the previous `last_verified_at`; checking an accessible programme page alone does not renew vacancy verification. `source_status: verified` identifies an evidenced first-party source, not a guarantee of current application availability. An unverified application check cannot pass validation as open or produce an Apply action. Both source verification and application evidence must be within seven days (168 hours); missing, malformed or future application evidence fails closed. Evidence older than seven days becomes Verification due, never presumed closed. Login-entry inspection is not a submitted or authenticated application; a published email address is not tested mailbox delivery.

The optional `review_due_at` is an earlier editorial recheck deadline, never an inferred employer closing time. White & Case's COOP is now explicitly closed by its employer; its exact `deadline_at` remains null. Records are repartitioned while the page remains open and after visibility/history restoration; timers only downgrade status and never refresh evidence dates. The empty state distinguishes overdue verification from filters that match no records. See [the 6 November review](docs/source-review-2026-11-06.md).

The owner requested the seven-day window after the initial repair review. [The policy-change record](docs/freshness-policy-2026-11-06.md) distinguishes the current rule from historical 24-hour audit evidence; no verification dates changed with the policy.

## Reddit jobs prototype

[`reddit-bot/`](reddit-bot/README.md) prepares one-post-per-advertised-opportunity drafts for r/SaudiLaw from the reviewed public feed. It is disabled, dry-run and protected by a build-time posting lock, with no recurring schedule or Reddit installation. Standing recruitment routes are excluded. See the [saved draft posts](docs/reddit-preview-2026-11-06.md) and [Reddit review/launch requirements](docs/reddit-app-review.md). This prototype does not alter the existing feed or deployment.

## Optional public alert setup

`dist/task-config.json` has `taskUrl: null`. The page therefore shows manual setup instructions and a working copy/download path rather than claiming that a shared task works. This optional ChatGPT alert route is separate from the owner's independent GitHub monitoring and does not control publication of the site.

## Connect the real task

1. In the owner's ChatGPT account, open Scheduled → “Elite law firm entry roles” → more options → Share → Copy link. Do not use conversation sharing.
2. Inspect the actual shared page. Verify the title, complete instructions, schedule and Asia/Riyadh time zone; confirm it is a personal-account share accessible to the intended recipients.
3. Put the actual `https://chatgpt.com/s/...` URL into `dist/task-config.json` as `taskUrl`. The app rejects conversation links, other domains, credentials, query strings and malformed paths. Format validation alone is not proof of a genuine task.
4. Run `node validate.mjs`, commit and publish the static files. The primary action becomes “Add alert to ChatGPT”; all native links use that single configuration value. No framework/application rebuild is needed, but changing hosted files requires publishing them.
5. Exercise WhatsApp on an actual iPhone: paste the public page URL, inspect its preview, open the page, tap Add alert, review the task, schedule a recipient's separate copy, and confirm its presence in that account.

Editing the original task does not automatically update the shared snapshot. Open Share and select Copy link again to refresh the same shared URL. Existing recipient copies are independent and do not inherit those updates. See https://help.openai.com/en/articles/7925741 and https://help.openai.com/en/articles/10291617-tasks-in-chatgpt.

## Files and portability

- `dist/index.html`, `style.css`, `app.js`: content, responsive presentation, opportunity filtering, source previews and copy/share interactions.
- `dist/opportunities.json`: structured, first-party opportunity records and freshness evidence.
- `dist/task-config.json`: public title, prompt, cadence, time zone, optional native endpoint. Never put secrets here.
- `dist/setup-instructions.txt`: downloadable manual fallback. Regenerate when the prompt changes; validation checks it matches the copy action.
- `dist/og.png`: generated social artwork, 1730 × 909; Open Graph/X metadata uses the GitHub Pages origin. Platforms may crop or cache it; actual WhatsApp rendering remains a device test.
- `preview.mjs` and `qa.html`: dependency-free local verification server and a 390 × 844 iframe fixture; neither is deployed.
- `validate.mjs`: source checks plus controlled integration tests. Synthetic task URLs are test data only.
- `scripts/reverify-opportunities.mjs` and source adapters: live, read-only evidence checks that write a proposed feed and audit report. Supported sources require an available application route and unchanged reviewed facts; unrecognized content requires editorial review.
- `scripts/propose-refresh.mjs`: validates that proposal, then creates or updates one owned draft review branch. It refuses to replace human commits or a PR marked ready for review.
- `test/`: source-checker and proposal regression tests, run with `npm test`.
- `vercel.json`: optional static Vercel deployment configuration. No Vercel deployment is claimed. Update canonical/OG origins if moving host.

Only `dist/` is deployed publicly. Preserve `.openai/hosting.json` only for the retained ChatGPT Sites copy; it does not control GitHub Pages.

## Source control and publishing

The public GitHub repository at `https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor` is the canonical source of truth and deployment source. Its `Deploy independent site` workflow publishes `dist/` to GitHub Pages on every push to `main`:

`https://mrmohaamd-cmyk.github.io/Legal-Market-Monitor/`

The prior ChatGPT Sites address remains live as an untouched legacy copy. It is not part of the publishing path and has no automatic synchronisation with GitHub. Do not treat it as a current deployment after this cutover unless a deliberate mirror process is introduced.

The private [Legal Market Monitor Alerts repository](https://github.com/mrmohaamd-cmyk/-legal-market-monitor-alerts) is the independent scheduled discovery service. It reads the public feed from `main`, checks its official sources and selected first-party careers routes, and maintains a private review issue. It never publishes a vacancy or changes the public site automatically: a source change is evidence to review, not proof of a suitable open role. Coverage and retrieval failures remain explicit in its reports.

### Future update workflow

1. Review the private monitor's report and this repository's `Prepare verified opportunity refresh` workflow. The latter runs every six hours at minute 17 and can be run manually after activation on `main`.
2. Its source adapters inspect the specific role and application route, retaining response fingerprints as audit evidence. A successful HTTP status or unchanged page hash alone cannot renew verification. Unsupported dynamic portals require manual browser review; their evidence dates remain unchanged.
3. The workflow prepares one draft PR with the candidate feed and check report. Review the actual source, Saudi location, eligibility, status, deadline and application evidence. For manual updates, create a branch, update the feed, and run `npm test` and `npm run build`.
4. Obtain approval before merging into `main`. GitHub Pages deploys `dist/` automatically on that merge. If verification has expired while the PR waits, rerun the recheck and review it again; changing a date by hand is not verification.

This is a one-way, review-gated process: `main` is published; GitHub Pages does not edit the repository. The draft-PR workflow runs in this public repository using its own `GITHUB_TOKEN`, so no cross-repository credential is needed. GitHub must allow Actions to create pull requests; if that setting blocks creation, the run fails visibly and retains the candidate files as artifacts for manual review. Do not add a token merely to hide that failure. All validation runs before the proposal; token-created PRs may not trigger another Actions run.

GitHub schedules are best effort. Off-peak repeated checks reduce dependence on the former once-daily 08:00 Riyadh run, but cannot promise an exact delivery time. A public repository's schedule can also be disabled after 60 days without activity. Inspect run history and artifacts when the freshness window lapses; [GitHub documents these scheduling limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Human review and merge are still required to keep the published feed current. Six usable routes in one review do not mean six advertised vacancies or complete 42-firm discovery.

The initial automatic adapters cover the two Latham recruitment routes, Kirkland's entry-level email route, and White & Case's specific programme rows with the trainee's separate employer facts. A&O and Segal still require a browser availability check. Pinsent's blank application destination remains unresolved. Unsupported checks report the limitation and leave human evidence unchanged; they cannot renew it. Run `node scripts/reverify-opportunities.mjs` locally to write `source-check-results/` without editing the published feed or creating a PR.

## Recovery

Absent or rejected task URL: manual setup remains available. Configuration fetch failure: the copy button is disabled, an explanatory status appears, and the downloadable instructions remain accessible. Opportunity-feed failure: no role is shown as current and the page directs visitors to the monitor. Clipboard denial: the relevant text is selected for manual copying. Unsupported or failed native sharing: copy the page URL; user-cancelled sharing is respected. Once connected, recipients may save the native task URL independently of this site.
