# Operational follow-through — 30 September 2026

## Scope and diagnosis

The prior coverage fix is present on main: 41 employer targets, five published records, distinct Pinsent Saudi programme sources, and review-only discovery. That does not itself prove usable browser journeys or sustainable editorial freshness.

Source inspection found two repository-subpath defects: the stylesheet imported `/tokens.css` at the host root, and the share button constructed the host-root URL. Both defects were reproduced before editing in Chromium mobile, WebKit mobile (390×844) and Chromium desktop (1280×900). The original validator explicitly expected the incorrect root import; passing it was not independent evidence of correct browser behaviour.

Publication freshness is a separate concern: unchanged employer content cannot renew an editorial timestamp. This public patch preserves last-recorded source access with visible timestamps and an explicit verification-due label, rather than falsely relabelling old records as open. The private collector receives a separate deduplicated publication-review signal in its own repository.

## Changes and acceptance evidence

GitHub Actions run 36726165523, job 109923467482, observed the unmodified source, applied exact-anchor changes on a feature branch, ran `npm run build`, and exercised all three browser configurations.

Before: all three configurations reported no loaded theme tokens, `/tokens.css` HTTP 404, and a shared URL missing `/Legal-Market-Monitor/`.

After: all three reported loaded theme tokens, the correct subpath sharing URL, no missing CSS/JS/JSON responses, no horizontal overflow and no page errors. Controlled exercises passed for a fresh Pinsent Apply action, filter/reset, same-tab external navigation, overdue-record source access, visible actual review dates, the all-overdue state, native-share cancellation, denied-clipboard fallback and an unavailable feed.

The external-navigation test intercepts the Oracle destination: it proves the application's link and navigation behaviour, not the employer's full application process. Fresh/overdue/error cases use intercepted fixture responses in the test browser only. They do not change live records, source facts or verification timestamps. WebKit emulation is not a physical iPhone test.

The one-off mutation script and its write-enabled workflow are removed before merge. The retained browser test is read-only and uses isolated test-only Playwright tooling, with no production dependency or new hosting service. It runs on relevant pull requests and after successful Pages deployment. Deployment now runs the existing build validation before uploading public assets; previously validation ran in parallel in a separate workflow and was not an in-job deployment gate.

## Retained boundaries and remaining limits

All opportunity records, verification timestamps, the 24-hour policy and 41-firm registry remain unchanged in this patch. Overdue records are not asserted open, and a failed feed does not produce a vacancy. No employer is contacted and no application is submitted.

The legacy ChatGPT Sites copy remains independent. Complete machine-readable discovery at all 41 employers and push/email delivery to the owner's physical device are not established by browser tests. The existing manual-review limitations remain recorded in the source-coverage ledger. Native notification settings require account/device verification; no settings access is implied.

## Reproduction and rollback

Run `npm run build`. With an isolated Playwright installation and Chromium/WebKit installed, set `PLAYWRIGHT_MODULE` to that installation's `index.mjs` and run `node scripts/browser-check.mjs`. Set `AUDIT_URL=https://mrmohaamd-cmyk.github.io/Legal-Market-Monitor/` for post-deployment checks. Browser artifacts are retained by CI for seven days. Revert the reviewed repair commit through a pull request to restore the previous implementation; no data migration or third-party-service rollback is required.
