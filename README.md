# Saudi Elite Legal Opportunities

A public static page for curated Saudi early-career legal opportunities. The canonical public deployment is GitHub Pages, built directly from this repository's `main` branch. A separate private GitHub Actions monitor checks official sources each day and opens a review issue when it detects a material change. No application server, database, accounts, API keys or analytics are used in production.

## Brand premise

This is not a law-firm site and should not simulate one. It is an independent monitor for ambitious early-career candidates. Its authority comes from visible provenance, a tightly defined Saudi-only scope, current-status handling and direct official routes—not prestige claims or decorative luxury. Retain the editorial hierarchy, source/fact distinction and calm, task-led interaction when maintaining the page.

## Opportunity feed

`dist/opportunities.json` is the publication record for the visible explorer. Every entry must use a reachable first-party source, preserve unknown deadlines and eligibility as unknown, and keep sourced facts separate from editorial assessment. `last_verified_at` is evaluated in the browser against `verification_window_hours`; overdue records are downgraded to “Verification due” instead of remaining labelled verified open. Passed deadlines and records explicitly marked closed or expired are suppressed from the current list.

To refresh the feed, recheck each source, update its record and verification timestamp, run validation, and publish. Do not advance a timestamp without actually checking the official source. A standing or “general opportunity” must be described as such and must not be presented as confirmed immediate headcount.

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
- `vercel.json`: optional static Vercel deployment configuration. No Vercel deployment is claimed. Update canonical/OG origins if moving host.

Only `dist/` is deployed publicly. Preserve `.openai/hosting.json` only for the retained ChatGPT Sites copy; it does not control GitHub Pages.

## Source control and publishing

The public GitHub repository at `https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor` is the canonical source of truth and deployment source. Its `Deploy independent site` workflow publishes `dist/` to GitHub Pages on every push to `main`:

`https://mrmohaamd-cmyk.github.io/Legal-Market-Monitor/`

The prior ChatGPT Sites address remains live as an untouched legacy copy. It is not part of the publishing path and has no automatic synchronisation with GitHub. Do not treat it as a current deployment after this cutover unless a deliberate mirror process is introduced.

The private [Legal Market Monitor Alerts repository](https://github.com/mrmohaamd-cmyk/-legal-market-monitor-alerts) is the independent scheduled discovery service. It reads the public feed from `main`, checks its official sources and selected first-party careers routes at 08:00 Asia/Riyadh, and opens a private review issue only when a material change needs attention. It never publishes a vacancy or changes the public site automatically: a source change is evidence to review, not proof of a suitable open role.

### Future update workflow

1. Review any alert against the primary source and update the public feed only with verified facts.
2. Create a branch in this repository, edit the source, and run `npm run build`.
3. Open and review a pull request. Confirm that the source URL, location, eligibility, status and deadline are accurately represented.
4. Merge the approved pull request into `main`. GitHub Pages deploys the validated `dist/` directory automatically.

This is a one-way, review-gated process: `main` is published; GitHub Pages does not edit the repository; the monitor only raises a private review signal. An automatically generated cross-repository publishing pull request is intentionally not configured, because it would require a separate credential with write access to the public repository and could expose unverified opportunity claims. If that automation is wanted later, use a least-privilege GitHub App or fine-grained token stored as a GitHub Actions secret—never in the repository.

## Recovery

Absent or rejected task URL: manual setup remains available. Configuration fetch failure: the copy button is disabled, an explanatory status appears, and the downloadable instructions remain accessible. Opportunity-feed failure: no role is shown as current and the page directs visitors to the monitor. Clipboard denial: the relevant text is selected for manual copying. Unsupported or failed native sharing: copy the page URL; user-cancelled sharing is respected. Once connected, recipients may save the native task URL independently of this site.
