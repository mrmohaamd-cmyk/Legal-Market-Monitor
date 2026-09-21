# Saudi Elite Legal Opportunities

One public static page combines a curated Saudi early-career opportunity explorer with an existing ChatGPT monitoring task. ChatGPT remains the scheduler. No application server, database, accounts, API keys or analytics are used in production.

## Brand premise

This is not a law-firm site and should not simulate one. It is an independent monitor for ambitious early-career candidates. Its authority comes from visible provenance, a tightly defined Saudi-only scope, current-status handling and direct official routes—not prestige claims or decorative luxury. Retain the editorial hierarchy, source/fact distinction and calm, task-led interaction when maintaining the page.

## Opportunity feed

`dist/opportunities.json` is the publication record for the visible explorer. Every entry must use a reachable first-party source, preserve unknown deadlines and eligibility as unknown, and keep sourced facts separate from editorial assessment. `last_verified_at` is evaluated in the browser against `verification_window_hours`; overdue records are downgraded to “Verification due” instead of remaining labelled verified open. Passed deadlines and records explicitly marked closed or expired are suppressed from the current list.

To refresh the feed, recheck each source, update its record and verification timestamp, run validation, and publish. Do not advance a timestamp without actually checking the official source. A standing or “general opportunity” must be described as such and must not be presented as confirmed immediate headcount.

## Current activation state

`dist/task-config.json` has `taskUrl: null`. The page truthfully shows manual setup instructions and a working copy/download path. A canonical shared task link has NOT been retrieved or verified. Do not label the recipient-copy journey complete until a real recipient successfully schedules it.

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
- `dist/og.png`: generated social artwork, 1730 × 909; Open Graph/X metadata uses the Site's absolute origin. Platforms may crop or cache it; actual WhatsApp rendering remains a device test.
- `preview.mjs` and `qa.html`: dependency-free local verification server and a 390 × 844 iframe fixture; neither is deployed. Start through Sites supervised preview.
- `validate.mjs`: source checks plus controlled integration tests. Synthetic task URLs are test data only.
- `vercel.json`: optional static Vercel deployment configuration. Vercel was unavailable in this session; no Vercel deployment is claimed. Update canonical/OG origins if moving host.

Only `dist/` is public. Source is retained in the Site's private Git repository. Preserve `.openai/hosting.json` project identity when publishing updates.

## Source control and publishing

The live page is currently deployed through ChatGPT Sites. Its Sites-managed repository remains necessary for that deployment flow; GitHub is **not** a deployment source unless the hosting arrangement is deliberately changed and verified.

The public GitHub repository at `https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor` is the external project mirror and durable project record. It contains the complete tracked source, including the static `dist/` directory and `.openai/hosting.json`, but never secrets, local runtime files, dependency caches, or deployment archives. There is no automatic synchronisation with ChatGPT Sites.

### Future update workflow

1. Edit the source and refresh any opportunity facts from their official source.
2. Run `npm run build` and resolve all validation failures.
3. Commit the verified source and push it to GitHub.
4. Push the same commit to the Sites-managed repository and publish through ChatGPT Sites.

Keeping the two repositories on the same commit preserves a clear, auditable correspondence between the GitHub mirror and the deployed source. Do not force-push either repository or treat a GitHub push alone as a live-site publication.

## Recovery

Absent or rejected task URL: manual setup remains available. Configuration fetch failure: the copy button is disabled, an explanatory status appears, and the downloadable instructions remain accessible. Opportunity-feed failure: no role is shown as current and the page directs visitors to the monitor. Clipboard denial: the relevant text is selected for manual copying. Unsupported or failed native sharing: copy the page URL; user-cancelled sharing is respected. Once connected, recipients may save the native task URL independently of this site.
