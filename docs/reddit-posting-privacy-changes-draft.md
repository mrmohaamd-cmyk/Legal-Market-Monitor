# Proposed privacy changes for the posting release

**Draft only. Not adopted, published as the app's policy, or saved in Reddit app details.** The effective notice on main continues to describe deployed private 0.0.3. No production posting is enabled. The operator must review/adopt the final wording before a changed posting release is submitted; this file does not accept terms on the operator's behalf.

Replace the preview-only ledger paragraphs in the current notice with a precise description of the approved deployment. Proposed wording:

> When posting is enabled in an approved release, the app keeps installation-scoped duplicate-prevention records in Reddit's Redis service. They contain hashes of public opportunity references and normalized job identities, random attempt references, attempt dates/states, post receipts and deletion/suppression tombstones. It does not keep Reddit post titles, bodies, application URLs or author identities in that ledger. Hashes are duplicate-prevention metadata, not a promise of anonymization.
>
> To authorize moderator controls, the app temporarily reads the initiating Reddit user's identity and moderator permissions for the current community. It does not retain those moderator identities in the ledger. For receipt verification, recovery or deletion, it reads the nominated bot post and checks its community, author and exact attempt reference. These post contents and author details are not retained in the ledger. The app does not read ordinary members' profiles or support correspondence automatically.
>
> Scheduler state contains the chosen schedule's status, random generation token and Reddit job ID. Stop controls can write a stopped state even when posting is locked. A separately authorized private test uses its own ledger and at most one synthetic post; it does not fetch vacancies or contain employer/application links.
>
> Duplicate-prevention hashes and operational state have no automatic expiry while needed to prevent reposting. The bounded ledger stops accepting new attempts at its capacity limit; it does not discard old claims to make room. Deleted or moderator-removed bot posts retain only necessary non-content tombstones. The cleanup path removes stored raw post receipts when a tracked deletion/removal event is processed. A verified suppression tombstone is also saved before an operator requests author deletion. Events, outages and uncertain API outcomes can delay cleanup; deletion is not promised to be instantaneous. Support/deletion requests are handled through r/SaudiLaw modmail.
>
> On shutdown or an applicable deletion request, the operator must pause posting and reconcile outstanding attempts before removing records that could otherwise allow an old opportunity to be reposted. Missing storage is never automatically recreated by starting the bot. First-time initialization requires a separate confirmation that there was no prior posting or lost ledger. The bot does not collect applicants' CVs, identity documents, application answers or contact details.

Retain the existing disclosures about Reddit/GitHub service records, diagnostic logs, third-party application sites and support visibility. Actual retention duties still apply; the design is not permission to retain Reddit-derived data indefinitely. Review the final policies against the deployed behavior and any Reddit review feedback.

The terms should describe the approved scheduled job-posting behavior, current evidence limits and support route, while retaining the no-employer-affiliation, no-application-collection and no-guaranteed-availability statements. No new promise about delivery, uptime, employer selection or application security is proposed.
