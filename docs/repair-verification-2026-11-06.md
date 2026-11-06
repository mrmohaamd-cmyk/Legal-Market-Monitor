# Publication repair verification - 6 November 2026

## Prepared result

The reviewed feed contains three advertised openings and three standing recruitment routes with supported current application entry, one explicitly closed White & Case COOP programme, and one Pinsent record awaiting application verification. See [the individual source review](source-review-2026-11-06.md). At the owner's request, the safeguard now allows seven days (168 hours) and checks both source and application evidence. The policy change did not alter any source evidence or verification dates. Missing, malformed, stale or future application evidence cannot produce an Open label.

The new public workflow prepares a single draft PR every six hours, after checking supported first-party sources, validating the proposed feed and running browser checks. It never merges or deploys. Supported checks require live application-route evidence plus unchanged reviewed facts; a page hash or HTTP 200 alone is insufficient. Human edits, ready-for-review PRs, closed unmerged proposals and concurrent remote branch updates are protected. Proposed files and check evidence survive PR-creation failures as artifacts.

## Executed verification

- All 50 public source-checker and proposal tests passed, including changed facts, role-bound closure, wrong-job redirects, hidden/script/template content, unavailable form controls, blocked sources, stale/future dates and failed proposal validation.
- `npm run build` passed, including the actual publication validator exercised against isolated editorial changes. Line-ending normalization permits equivalent Windows and Linux setup-instruction text.
- Chromium mobile (390 x 844) and desktop (1280 x 900) browser checks passed against the actual edited feed: six current records, two watch/archive records, correct official links, no application action on pending records, seven-day expiry without reload, filters, sharing and failure states. No horizontal overflow, missing assets or JavaScript errors were observed. The mobile screenshot was visually inspected.
- The initial automatically generated proposal, before the seven-day policy change, separately passed Chromium mobile and desktop journeys from its isolated output directory. The seven-day checker is covered by the updated proposal tests without inventing another live verification date.
- A separate real local Git/bare-remote harness passed branch creation and replacement, preservation of human commits and ready PRs, lease rejection of a concurrent update, and recovery after an uncertain PR-create response. GitHub requests in that harness were mocked; no external PR was created by it.
- Historical live read-only automatic checks under the previous 24-hour policy at 12:05:37 UTC and response fingerprints are recorded in [the bounded JSON audit](automated-source-check-2026-11-06.json): four verified routes, the confirmed COOP closure, and three manual checks. No raw employer HTML is published in that audit. The generated proposal passed the same publication validator in a separate temporary directory; it did not overwrite the manually reviewed feed.
- The initial private monitor repair independently passed 50 unit/integration tests, a read-only live source audit, and [GitHub CI](https://github.com/mrmohaamd-cmyk/-legal-market-monitor-alerts/actions/runs/42214679868). The seven-day follow-up passed 52 tests. Its [draft PR #46](https://github.com/mrmohaamd-cmyk/-legal-market-monitor-alerts/pull/46) includes the complete coverage and failure receipt and current CI status.

Local checks used Node 24.21.0 and installed Chrome. GitHub PR CI uses Node 22 and also runs mobile WebKit. Check that CI result separately; local Chromium success does not prove WebKit or actual iPhone behavior.

## Activation and remaining work

No production merge or deployment occurred. Both repair PRs require approved merges. Then verify a real scheduled source check, private review-queue update, automatic draft proposal, approved publication and deployed browser check. Actions must permit its token to create draft PRs; if disabled, the workflow reports the failure and retains artifacts rather than inventing or storing another credential.

A&O and Segal application entry still requires browser review. Pinsent's Oracle page remains blank and its previous successful verification date is preserved. The newly detected A&O March 2027 trainee is a review candidate until its application entry is checked. Other restricted or unreadable sources and the unavailable live LinkedIn provider are documented in the private source audit; complete 42-firm vacancy discovery is not claimed.

Human review and approved publication remain necessary within the freshness window. If approval waits beyond seven days, rerun the source checks and repeat any required manual checks. GitHub schedules remain best effort. The legacy ChatGPT Site is managed separately and is not changed by these repository PRs.
