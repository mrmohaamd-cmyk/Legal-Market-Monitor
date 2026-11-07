# SaudiLaw Jobs

SaudiLaw Jobs is a **preview-only moderator tool** for checking reviewed Saudi legal jobs and training opportunities. It cannot publish posts. It does not receive applications or CVs. Operator: [u/BannedForThe7thTime](https://www.reddit.com/user/BannedForThe7thTime/). Support and correction/deletion requests: [r/SaudiLaw modmail](https://www.reddit.com/message/compose?to=r/SaudiLaw).

[Terms](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-terms.md) | [Privacy notice](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-privacy.md), adopted and effective 7 November 2026. These exact URLs are saved in app details.

## How to use this release

The subreddit menu contains:

- **Preview SaudiLaw jobs** - moderators only. Checks the reviewed feed and reports eligible/excluded counts. No post or duplicate-prevention record is created.
- **SaudiLaw Jobs: About** - explains preview-only operation; it does not navigate anywhere.
- **SaudiLaw Jobs: Terms**, **SaudiLaw Jobs: Privacy**, **SaudiLaw Jobs: Contact moderators** - available to community members. Each opens only its named, fixed destination after the user selects it. Terms and privacy open the published GitHub notices; Contact moderators opens r/SaudiLaw modmail. The app does not read or send the message.

For an authorized private preview, open installation settings, switch **Enable feed checks** on, leave **Preview only (do not post)** on, then choose Preview. Turn checks off afterward. Disabled checks report that state. About and policy/support navigation work even when checks are disabled. Defaults are checks off and preview-only on.

The two allowed communities are r/SaudiLaw and the private development community r/saudilaw_jobs_dev. Other communities fail closed. Changing settings cannot bypass the code-level posting lock. There is no recurring schedule, install-triggered action, public HTTP endpoint or user-account posting.

## What the check means

The feed comes from the public, human-reviewed `main` branch of `mrmohaamd-cmyk/Legal-Market-Monitor`. Only explicitly advertised openings with verified source/application/editorial evidence less than 168 hours old qualify. Closed, stale, uncertain and standing recruitment-route records are excluded. The approved registry pins identities and source/application URLs. Missing work model, salary and deadlines stay unknown. A successful download does not recheck an employer's site or guarantee application availability.

Current hosted preview feedback gives counts and diagnostic status; it does not display or publish a complete job post. Local developer previews can produce the proposed post text. Employers control their hiring; source evidence and support remain necessary.

## Permissions and data

Runtime capabilities are Reddit API, Redis and HTTP fetch. This version's information controls use no feed, storage or Reddit API calls. Preview checks read settings and the public feed but write no posting ledger. Diagnostic logs contain public record IDs/titles, skip reasons and feed provenance. The app does not intentionally store applicant data, viewer profiles, usernames or user-post bodies.

The future posting adapter remains locked. Its conservative atomic day/job/identity claims and uncertain-result handling are locally tested, but live Reddit posting/storage integration is not claimed. Before any later posting release, implement/test deletion and reconciliation, reverify sources, obtain Reddit review and obtain owner authorization. The adopted privacy notice describes these conditions.

## Fetch Domains

`api.github.com` - approved for this app. An unauthenticated HTTPS GET reads the fixed repository contents endpoint for `dist/opportunities.json?ref=main`. Path, size and Git blob identity are checked; redirects and invalid responses are rejected. No GitHub credential or Reddit viewer data is added. Employer/application sites are future link destinations, not runtime fetch hosts.

## Review request: external links and release scope

Please assess this **preview-only release**, including explicit navigation to its two GitHub-hosted policy notices and Reddit modmail. No job posts, external application submissions, applicant collection, monetization or autonomous posting are enabled.

The intended later job-posting design would link to employer sources and their application providers: `careers.aoshearman.com`, `jobs.aoshearman.com`, `www.segal.com.sa`, `www.whitecase.com` and `whitecase.grad.allhires.com`. Employer linkage and public privacy notices have been reviewed; authenticated application journeys and backend security have not been certified. We request guidance on permission and conditions for that planned off-platform use. **Approval of this preview does not constitute approval of a later changed posting release.** That release must be submitted again with its tests and exact behavior.

## Verification and developer information

Private version 0.0.2 completed a real moderator preview with three candidates, five exclusions and no backend validation/bridge errors. The additional information/navigation controls in this candidate still require native Reddit web/mobile and role checks after an authorized private upload/upgrade. Local response tests and SDK compilation do not establish native navigation or Reddit approval.

See [development details](DEVELOPMENT.md) for local build/preview commands, source contracts, concurrency handling and historical setup evidence. This README is included in the app version's review information. No command in the local npm test/build/check scripts uploads, publishes, installs or enables the app.
