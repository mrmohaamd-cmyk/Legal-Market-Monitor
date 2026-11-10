# Fixed review candidate refresh

The existing six-hour `Prepare verified opportunity refresh` workflow now prepares a fresh **review-only** SaudiLaw candidate separately from the general site's draft feed updates. No new schedule, permission, token or Reddit publisher is introduced.

`scripts/review-candidate-template.json` is derived solely from public commit `65c4a0802ddb9c7d10754dacc381ef4621bec133`: the White & Case record in `dist/opportunities.json` and the candidate already published in `dist/saudilaw-publication-candidates.json`. It contains no private bot code, data or credentials. A code-held digest binds that template. Its dated evidence is historical reference only and is never reused as fresh evidence.

The producer uses the already-public AllHires programme-row/email-entry check and the already-public full White & Case programme-article hash check. Only these two fixed official URLs are fetched. The current public feed must still contain exactly one open target with identical reviewed semantics; editor-closed records are never reopened. The source deadline's early Riyadh editorial cutoff remains in force and is not represented as an employer closing time.

If both independent official checks succeed, the producer preserves the public bilingual wording, semantic identity and translation hash. It changes the checked-at line and binds newly fetched body hashes, sizes and timestamps. The candidate lifetime is at most 12 hours and ends no later than the reviewed deadline cutoff. `publication_enabled=false`, `accepted=[]`, and `translation_status=pending` remain fixed. A timestamp refresh is not a semantic update.

If the portal closes, its programme/deadline changes, the full article changes, requests fail, source records change or the deadline cutoff passes, the producer emits **no candidate**, plus a specific quarantine reason and a source-attention report. It does not continue publishing an old positive preview or imply that the whole opportunity market is empty. Transport failure before a report is possible leaves the old artifact to expire normally and fails the workflow visibly.

## Narrow write boundary

The normal existing `GITHUB_TOKEN` and existing `contents: write` permission may commit only `dist/saudilaw-publication-candidates.json` on main. No general feed record or site content is automatically changed. `scripts/publish-review-candidate.mjs` requires the canonical repository, existing schedule/manual event, main ref, an unchanged workflow/source commit, clean tracked checkout, a fresh bounded candidate and its matching source report.

The report binds the exact producer commit. Before commit and push, the helper rechecks input bytes, freshness, changed-file scope and main. The push is an ordinary fast-forward operation; there is no force, merge, retry or protection bypass. A concurrent main change blocks it. After either an acknowledged or uncertain push, the helper independently checks the remote commit and fetches the resulting candidate bytes. Only a matching positive result produces a confirmed write receipt. A missing or superseded result is reported as unconfirmed; no second push is attempted.

Normal GitHub-token commits do not trigger another push workflow, so this metadata-only renewal does not trigger Pages deployment. The Devvit reader consumes the fixed GitHub main-branch file directly. This metadata renewal never grants the reader permission to post. Changing templates, source facts, languages, publisher scope or runtime authorization requires a reviewed code change.

The general source checker continues to prepare `dist/opportunities.json` and `docs/latest-source-check.md` on its existing dedicated draft branch. That path retains its manual-review/merge boundary. Both source evidence and candidate receipts are retained as seven-day workflow artifacts.

## Local review

```text
node --test test/review-candidate.test.mjs
node scripts/review-candidate.mjs dist/opportunities.json <local-output-directory>
```

The second command reads public employer pages and writes local artifacts only. Do not call the Git write helper to test against a live repository; its tests use isolated temporary local repositories and exercise remote-movement rejection, source/artifact mutations, positive readback and uncertain-push reconciliation without contacting GitHub.
