# SaudiLaw Jobs — draft privacy notice

**Prepared 7 November 2026 for owner review. Not adopted or effective. Do not use this draft as the app's published policy URL.** On adoption, remove the title's draft label and the final editorial sentence about pending owner adoption, replace this paragraph with the actual effective date, and publish the approved text at a stable public URL.

## Operator and contact

SaudiLaw Jobs (`saudilaw-jobs`) is operated by Reddit user [u/BannedForThe7thTime](https://www.reddit.com/user/BannedForThe7thTime/) for r/SaudiLaw. Send questions, correction requests or requests to delete information handled by the operator through [r/SaudiLaw modmail](https://www.reddit.com/message/compose?to=r/SaudiLaw), identifying the app and relevant post or reference ID.

## What the app processes

The app reads public opportunity records from `mrmohaamd-cmyk/Legal-Market-Monitor` on GitHub. Reddit supplies the community context and installation settings needed to restrict its operation. The app does not intentionally store viewer profiles, Reddit usernames, user posts or comments, CVs, identity documents, application answers or applicant contact details. It does not read support messages automatically.

The current preview version does not write a posting ledger. A later approved posting version would use Reddit-hosted storage for public opportunity IDs, normalized employer/role/location identities, attempt dates and states, and returned bot-post IDs. These records prevent duplicate or uncertain submissions from being retried. They are not applicant records.

Operational logs contain result status, public opportunity IDs and titles, skip/error reasons and public-feed provenance. The code does not intentionally add viewer or applicant information to its GitHub request. It has no advertising, payments, account-linking or analytics integration.

## Retention and deletion

The current preview code creates no durable posting ledger. Its diagnostic logs are handled through Reddit's Devvit service. The documented log-viewing window is not a guarantee about all of Reddit's underlying retention.

The proposed posting ledger has no automatic expiry. While posting operates, minimal duplicate-prevention records are retained so an old, removed or uncertain post is not automatically recreated. This does not mean Reddit-derived information may be kept forever: information under the operator's control must be removed when no longer needed, on shutdown, when Reddit requires it, or in response to an applicable deletion request. Requests can be made through the contact route above. Before posting is activated, the operator must have a tested reconciliation and deletion procedure; none is currently deployed. If deletion would compromise duplicate prevention, posting must remain paused until that is resolved.

## Platforms, support and applications

Reddit hosts the app and may process service data under its [privacy policy](https://www.reddit.com/policies/privacy-policy). GitHub supplies the public feed and may process request data under its [privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The app does not control those platforms' own records.

If you voluntarily contact the moderators for support, your message and Reddit account identity are handled in Reddit modmail and are visible to the community's moderators. Send only what is needed to explain the issue. The bot does not copy that correspondence into its ledger.

Following an employer or application-provider link leaves Reddit. Those sites may collect personal information and documents under their own policies. The bot does not receive applications or CVs entered there. Questions about information submitted to an employer or provider should also be directed to that provider.

Material changes to this notice will be published with an updated effective date. The operator/contact choice and future retention procedure above require owner adoption; this draft does not assert that Reddit has approved the app or that any destination has been certified secure.
