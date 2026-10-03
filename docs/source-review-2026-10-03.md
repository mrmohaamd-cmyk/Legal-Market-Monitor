# Bounded source review — 3 October 2026

## Evidence and scope

This local editorial patch transcribes native first-party browser findings supplied by the reviewing session at approximately 08:52 UTC on 3 October 2026. The patch author did not repeat those employer-page visits. `last_verified_at` records that source-review minute as `2026-10-03T08:52:00Z`, not the later patch-preparation time; seconds are not independently known. No application was submitted.

Main was fetched and verified at `93a60077691fe1800d92ca5991f91604b36f3271`. Separate Segal PR #5 was fetched read-only and verified at `ede37b0322ca0d7cb19542ca66fbdc6658a64a78`. This patch adds no Segal record or registry expansion. Feed-generation and registry-wide review metadata are deliberately unchanged: this is a bounded record review, not a new full-market audit.

## Reviewed records

| Record / first-party source | Findings and editorial treatment |
| --- | --- |
| [A&O Shearman COOP](https://careers.aoshearman.com/en/job/riyadh/co-op-scheme-winter-2026/3392/44638109504) | Remains open; seven months, January/August intakes, undergraduate law enrolment and university letter. Applications **open** 14 September 2026, not an observed midnight posting. Closing wording: **30 November 2026 at 5pm**, timezone unstated. `posted_at` and the unsupported offset-bearing `deadline_at` become null. Date-only `application_open_date` and literal `deadline_source_text` preserve the evidence in the card. |
| [Latham trainee](https://eume-earlyassociatecareers-lw.icims.com/jobs/11015/general-opportunity%3A-trainee-associate---riyadh/job) | Live iframe Apply action; general two-year route, partly stated eligibility; RecruitingRY@LW.com. Dates remain null. Verification/provenance refresh only. |
| [Latham graduate COOP](https://eume-earlyassociatecareers-lw.icims.com/jobs/11016/general-opportunity%3A-graduate-training-program-%28coop%29---riyadh/job) | Live Apply action; general route for students/graduates. Length and deadline unknown. Verification/provenance refresh only. |
| [Kirkland Riyadh](https://www.kirkland.com/careers/asia/saudi-arabia) | RY_Entry-Level_Legal_Recruiting@kirkland.com remains listed. No specific vacancy, confirmed headcount or dates established. Verification/provenance refresh only. |
| [Pinsent internship](https://www.pinsentmasons.com/careers/early-talent/saudi-arabia/internship-programme) | Dates tab #2, salary #4 and support #5 confirm 11 October start, three months, September 2026 opening and rolling applications without an exact deadline. Monthly allowance amount disclosed to shortlisted candidates. Outstanding interns may receive future full-time opportunities; a trainee-lawyer position is not specifically stated. Hours and compatibility with concurrent Tabby employment remain unknown. |

Material-update timestamps advance only for A&O's date correction and Pinsent's content correction. The other three retain their existing material-update timestamps. The 24-hour freshness downgrade remains active. Source-local deadline text is not parsed as an absolute instant: A&O cannot automatically expire at an invented cutoff and must continue to be reverified. Existing dated deadlines elsewhere retain their automatic expiry behavior.

Pinsent's Oracle application URL and separate closed COOP status retain their 30 September provenance; this bounded review does not claim a new application-destination or COOP-status check. Existing coverage audit history is retained.

## Ashurst and unresolved coverage

The supplied native browser review of the [Ashurst Perkins Coie ATS](https://fsr.cvmailuk.com/ashurstperkinscoiecareers/main.cfm?srxksl=1) selected **All roles** for **Riyadh** and **Jeddah**; both searches displayed no results. This is a point-in-time search observation, not proof that the employer has no vacancies. The registry retains `no_record_displayed`. Successful browser access does not repair or clear automated retrieval warnings.

Private alerts-repository issues #9 and #10 remain unresolved. AS&H Clifford Chance, White & Case, Khoshaim and Hourani/ZH Partners still require review. No issue is closed; no monitor retrieval warning, review gate or private monitor configuration is changed. No push, PR mutation, merge or deployment is performed.

## Local checks

`npm run build` passed on both verified main plus this patch and PR #5 plus this patch. Schema/content, freshness/expiry, routing and editorial mutation checks all passed. Windows Git initially converted the setup text to CRLF, causing its byte-parity assertion to fail; restoring the repository's LF content passed without a source change.

`node scripts/browser-check.mjs` passed Chromium mobile (390 × 844), WebKit mobile (390 × 844) and Chromium desktop (1280 × 900) on both bases. The added check verifies that the A&O card displays its source-local closing wording and 14 September opening date instead of claiming no stated deadline. Existing theme, overflow, filter/reset, same-tab navigation, share/copy fallback, stale-record and feed-failure checks passed; no missing assets or page errors were recorded. The main mobile screenshot was also inspected.

Applying the main diff directly onto PR #5 initially found a textual conflict where Segal is appended after Pinsent's final provenance line. A companion diff against PR #5 resolves that overlap by composing records by ID. Assertions confirm that the Segal record, coverage ledger and generation metadata exactly match PR #5; the companion changes only the five reviewed records plus the same UI, validation and review files. Use the patch matching the base, not both patches.

Browser checks use controlled freshness fixtures and intercepted external navigation; they do not independently verify employer availability or submit applications. Browser emulation is not a physical-device test. Test-only browsers were downloaded into Temp; no production dependency was added. Final delivery is local and uncommitted.
