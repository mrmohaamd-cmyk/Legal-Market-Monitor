# Minimal upstream bridge — disabled proposal

This branch connects the existing feed to a bounded source verifier and a deterministic bilingual preview compiler. It changes no deployed feed, monitor workflow, credentials, Reddit installation or schedule. It does not authorize recurring publication. The approved A&O bilingual pilot remains separate and unchanged.

## Existing stages and boundaries

- The private discovery service already checks employer routes every six hours and labels discovered candidates unverified. Reuse its output; do not create a second crawler.
- The public source-refresh workflow rechecks known records and prepares an owner-reviewed draft PR. It does not merge or publish automatically.
- The current Reddit app fetches the public feed on demand. Its installed v0.0.7 source has not been found in the inspected cloud repositories or Library, so this branch does not modify or reconstruct its consumer.
- Current implementation scope is exactly White & Case's Saudi Law Trainee Program 2027. Reuse the existing audited programme-row parser and full reviewed article fingerprint, together with exact source URLs and the reviewed record. This verifies a known advertised programme, not arbitrary new discoveries.
- A&O, Segal, changed formats and all other unsupported sources are quarantined. Standing Latham/Kirkland routes never become vacancies. A successful fetch, unchanged overall page hash or discovery score cannot establish eligibility.
- The Arabic phrase catalogue is a draft. Its review status is pending. Deterministic checks bind both languages to shared fact IDs and an exact reviewed semantic record; they do not establish translation quality. No arbitrary prose translation runs automatically.

## Files and operation

- scripts/pipeline/catalogue.mjs: versioned reviewed source record, structured facts, paired draft Arabic/English phrases, pending translation review.
- scripts/pipeline/core.mjs: semantic binding, existing adapter integration, provenance validation, expiry, stable identity, duplicate quarantine, bilingual rendering and snapshot validation.
- scripts/pipeline/transport.mjs: two exact employer URLs; no redirects, credentials, form submissions or browser. One cached attempt per URL, 15-second per-request timeout, 45-second run budget, 2 MB per response, 4 MB aggregate. Errors/403/429 are not retried.
- scripts/pipeline/run.mjs: explicit check/status command, immutable content-addressed JSON result and a concise actionable health summary.
- test/pipeline-*.test.mjs: dependency-free Node tests, including mocked HTTP evidence. No live post or employer application is created.

From an authorized cloud checkout:

    node --test test/pipeline-core.test.mjs test/pipeline-transport.test.mjs
    npm test
    npm run build

A deliberate read-only live check (not part of unit tests):

    node scripts/pipeline/run.mjs --check-live

This fetches only the two allowlisted employer pages and writes pipeline-results/<sha256>.json. It does not modify dist/. Do not commit generated results blindly. Immutable snapshots contain hashes and limited provenance, not raw HTML or private candidate text. Failure prints run_failed and exits nonzero. Valid but quarantined results report attention_required and specific reasons; these are expected safeguards, not success claims.

One read-only status command:

    node scripts/pipeline/run.mjs --status pipeline-results/<sha256>.json

Snapshot freshness lasts at most 12 hours (two expected six-hour checks). Source evidence must be no older than 168 hours, never future-dated, and before the programme's conservative editorial cutoff. The exact employer closing time/timezone remains unknown. Fresh verification renews evidence separately from unchanged semantic and bilingual digests. New facts, unknown added record fields, substituted links and closed records are withheld; dates must never be advanced by hand.

All snapshots have publication_enabled=false and accepted=[] in this release. Verified source results appear only in previews; pending translations and all excluded candidates have quarantine reasons. SHA-256 detects content changes but is not an authenticity signature; any future consumer must also fetch from a fixed trusted repository/path and validate the policy, record structure, provenance and expiry. It must never post previews.

## Minimal integration after validation and approval

1. Keep the existing discovery inventory. New candidates require a supported adapter and explicit structured fact/translation review. Formats outside those adapters remain review work.
2. Approve the exact bilingual phrase catalogue and adapter scope, then connect this command to the existing six-hour verification workflow. Add no service or key. Store a bounded current health artifact and preserve immutable run receipts.
3. Decide one narrow publication boundary: automatically advance only unchanged, already approved source facts after successful fresh verification; new or changed roles remain quarantined. The existing public feed and the site's review process must not be silently overwritten.
4. Obtain the exact approved v0.0.7 source in an authorized cloud workspace before consumer changes. Preserve its reservation/receipt/uncertainty mechanism, require stable employer/programme identity, and retain deleted-post suppression. A title change must never create a new identity.
5. Test the complete chain with fixtures, then a permitted private end-to-end run. No posting, redeployment or review submission is included in this branch.
6. Obtain explicit release and recurring-post scope approval before activating anything.

Proposed recurring scope for review: r/SaudiLaw only; one new verified advertised Saudi legal opportunity per UTC day at 06:00 UTC / 09:00 Riyadh; no catch-up burst, comments, cross-posts or reposts of deleted/suppressed identities. Only approved source adapters and bilingual fact sets; fewer/no posts when evidence is unavailable. Unknown submission outcome pauses posting for receipt reconciliation; never retry blindly. Existing authorization remains one approved A&O post, not this recurring scope.

## Single control without another dashboard

Observed existing Reddit controls are Job bot status, Start daily jobs and Stop daily jobs; Start registers Reddit-hosted scheduling, Stop invalidates callbacks and cancels jobs. Their current production ledger and schedule contents were not observed in this task.

The minimal proposed extension is to have Job bot status read the same snapshot health: source checked time, expiry, quarantine count/reasons, last feed consumed, last post receipt and uncertainty halt. Start should refuse stale/unapproved feed; Stop should remain the publication kill switch. The GitHub discovery/checking schedule can keep gathering read-only evidence while posting is stopped.

This proposal is not implemented in the installed app and does not give the local status command control of Reddit. There is no verified one-click cross-platform command. No new dashboard, service, token or persistent access is needed for the proposed design.

## Monitoring and recovery limits

A source or translation failure quarantines the role. Retrieval has no automatic retry this run; the next six-hour verification run is the next bounded opportunity. Source closure remains explicit. Snapshots expire when the upstream stops, so the future consumer must fail closed rather than reuse the last healthy result indefinitely.

The existing monitor can report missed-run gaps when it resumes. It cannot report its own complete outage while not running. An independent watchdog is not implemented here; before activation, choose an already-authorized notification path or accept that limitation. Do not claim alert delivery, an end-to-end test, or live scheduled production verification from these unit tests.

Validation status at preparation: tests written, not executed in the Windows thread. A separate authorized Linux cloud worker is to run them at the exact branch commit. Browser, deployment, employer live fetch and production posting are not part of this preparation.


## Independent cloud validation received

At commit 0d99584f2dd95fca8a11e6560794d2f62dee75ed, the coordinating Linux cloud worker reported 22 targeted pipeline tests passing, all 72 repository tests passing, and npm run build passing. The working tree remained clean before the deliberate live check.

The read-only live check made exactly two allowlisted requests, retrieved 172109 bytes with zero transport failures, and produced one White & Case preview, zero accepted records, and the expected translation/unsupported/closed/standing-route quarantine reasons. Snapshot SHA-256: 7929b8746ab05740d8ecf5ffa3e70de9f9e848e24fb26f39568c354fddc55aec. Generated 2026-11-09T14:05:28.915Z; expires 2026-11-10T02:05:28.915Z. It exists only in the cloud test workspace; no feed publication or Reddit action occurred.

This verifies the narrow upstream path, not discovery of new roles, approved bilingual wording, consumer integration or end-to-end production posting.

## Dashboard addition

tools/saudilaw-control/ adds a static local workspace outside the deployed dist/ directory. It can import and inspect disabled preview receipts, edit bounded proposal settings, and export the proposal with an unsigned local activity record. Its Reddit controls are visibly unconnected. No API, credentials, browser persistence or background network request is added.

The snapshot freshness indicator is distinct from publication readiness: every imported result remains not publishable, with zero accepted records. Integrity alone never authenticates source content or translation approval. Exported settings are not consumed by the current CLI or any deployed process. See the workspace README for the cloud test route and remaining browser validation.
