# Independently reviewed programme bundles

This producer emits a separate, nonpublishing feed at
`dist/saudilaw-owner-bundles.json`. It does not overwrite the legacy owner-job,
opportunity, source-coverage or publication-candidate feeds.

## Evidence and authority

Input `config/saudilaw-owner-bundles.json` has schema
`saudilaw-owner-bundle-input/v1` and a `bundles` array (maximum four). Each
White & Case bundle contains exactly three individually validated canonical
owner-job records in `jobs`, plus the bilingual editorial fields in
`contracts/owner-bundle.mjs`. Do not invent source fingerprints or recalculate
them merely to accept a changed employer page. Source changes require review.

`node scripts/check-owner-bundles.mjs OUTPUT_DIRECTORY` verifies every source
against its reviewed fingerprint and required text, and checks anonymous
application controls. All members share the existing request/time budgets.
Any failed member remains visible as attention-required and prevents constructing
the complete publication model. No two-card fallback is generated.

This separate evidence path can inspect an owner-suppressed programme. That is
not a publication grant: the original native ledger identity and suppression
remain unchanged. The ordinary legacy compiler still blocks the withdrawn
programme. Publication requires independent native-state checks and any
explicitly authorized audited supersession in the bot.

## Fixed writer

`scripts/publish-owner-bundles.mjs` accepts only the canonical repository main
workflow, an exact input/report binding and the preceding owner-job write receipt. If that check failed before any write,
the independently confirmed coverage receipt can be used only when local HEAD
and remote main still match its exact commit. Missing acknowledgment with changed
local or remote state fails closed.
It permits only the three existing audited data writes between workflow SHA and
HEAD, compares remote main before writing, stages only the fixed bundle path,
pushes once without force, and verifies the exact remote commit and bytes.
An uncertain write is not retried. `publicationEnabled` remains false.

The writer runs with `OWNER_BUNDLE_DIRECTORY` and `OWNER_JOB_DIRECTORY`.
The existing serialized refresh workflow runs this checker after coverage and
owner jobs, without another schedule or credential. An unrelated owner-job check
failure does not block bundle evidence when the confirmed coverage base remains
unchanged. The three actual programme records have been reviewed and included;
unit fixtures remain explicitly synthetic. Source-check failure emits held rows,
not a publishable partial bundle.

## Verification

Tests cover three-member output, legacy suppression preservation, source drift,
incomplete bundles, duplicate identities, input mutation, real CLI import/load,
fixed writer scope, wrong workflow/digest, remote movement, stale evidence and
lost push acknowledgment. None establishes actual Reddit publication, review
approval, source freshness at dispatch, or a live deployment.

## Fixed White & Case identity evidence

The reviewed `white-case-programmes-2027-2029/v1` profile combines the actual
official programme heading and Riyadh location with the exact programme/intake/
deadline row in the anonymous application portal. The mapping is code-held,
limited to three IDs, exact official URLs and canonical historical titles.
It does not change identities to accommodate a heading or clear suppression.
The Saudi member must retain `reviewContext.suppressed: true`; the bot separately
checks the authoritative native ledger and any explicitly authorized supersession.

The application portal has rotating hidden anti-CSRF fields. Only this fixed
profile permits an application visible-text fingerprint, while the unmodified raw
response must still contain enabled anonymous email and submit controls. A changed
visible row or missing controls holds the source. No tokens are stored in source
configuration or committed evidence.

Actual source intake and the held live-check outcome are documented in
`wc-programme-source-review-2026-11-15.json`. A captured-source integration replay
is not equivalent to a new successful network check.

## Explicit recorded-source intake

`node scripts/check-owner-bundles-recorded.mjs OUTPUT CAPTURE_DIRECTORY` is
an operator-only path for already retrieved and reviewed public evidence.
It validates the exact official URL, successful receipt, raw body hash/bytes,
the configured reviewed projection, programme assertions and anonymous controls.
Original retrieval times remain on each proof; captures older than 12 hours,
future times, missing sources or changed bodies reject. Member expiry is capped
at the oldest member source capture plus 12 hours, never compilation time.

Its separate report declares `networkCheckPerformed: false` and includes original
and normalized capture timestamps. It does not establish live current availability.
The ordinary workflow writer rejects this different report schema; this command
cannot silently replace a failed network check or publish a live feed. Raw
responses, including hidden application form tokens, stay outside the repository.
Only sanitized provenance may be retained with the reviewed release.

## Manual recorded release

The separate Release reviewed recorded programme evidence workflow has no
schedule or push trigger. Generate sanitized feed/report with the recorded intake
from the exact reviewed current-main commit, then explicitly dispatch it on main
with those two JSON strings. Inputs are parsed as data through environment
variables, never substituted into shell commands. No raw HTML is accepted.

The release validator binds each proof time/hash to the committed operator-reviewed
source receipt and the exact current input. This is trusted operator provenance,
not a provider-signed receipt or a new network observation. GitHub commit identity
makes that review durable; a mutable local manifest cannot refresh the date.

The manual writer shares the existing refresh concurrency group, rechecks
HEAD/remote and expiry, writes only the feed and a sanitized durable recorded
receipt, pushes once without force and independently verifies remote bytes.
It rejects schedule/push events, held members, changed input, arbitrary report
fields, unrecognized provenance and uncertain outcomes. There is no automatic
retry or timestamp renewal. A later live refresh may replace the feed; the
recorded receipt then applies only to its named feedSha256, not the newer feed.
