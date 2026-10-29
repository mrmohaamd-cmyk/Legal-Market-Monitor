# Publication review — 30 October 2026 (Riyadh)

## Scope and evidence standard

Reviewed the eight records in canonical public main `f2093f060ef2cd268440129c7f49fb589e1b6097` after private monitoring issue #37. No open public PR existed at inspection. This is a bounded editorial review, not a new 42-employer market census. The 28 October inventory reconciliation and Segal's disabled/manual monitor remain unchanged.

Official sources and public application entry points were inspected during 29 October 23:12–23:18 UTC (30 October 02:12–02:18 Riyadh). The feed records review completion at `2026-10-29T23:18:54.239Z`, not a fabricated per-request capture time. Employer pages were read with web retrieval and interactive browser checks where the application route required them. No accounts, consent, messages, applications or uploads were submitted. Successful authenticated completion and mailbox delivery are outside this check.

## Disposition

Four advertised openings remain supported, three standing recruitment routes remain accessible, and one record cannot be sufficiently verified. None of the eight has affirmative closure evidence. A passed programme start is not an application deadline.

| Record | Decision | Application evidence and material limits |
| --- | --- | --- |
| `ao-shearman-winter-2026-coop` | Open advertised opening | Official vacancy 11180BR retains its Apply link to BrassRing job 98119, which reaches sign-in. Seven months; undergraduate law, strong GPA, assessment, Arabic/English and university COOP letter. Deadline remains 30 November 2026 at 5pm, timezone unspecified. No authenticated flow tested. |
| `latham-riyadh-graduate-coop` | Open recruitment route | iCIMS 11016 has a live Apply action reaching the role-specific email/profile entry screen. Students/graduates; no specific intake, duration or deadline. Immediate headcount is unconfirmed. |
| `latham-riyadh-trainee-associate` | Open recruitment route | iCIMS 11015 has the same verified public-entry journey for the two-year trainee route. Detailed qualification thresholds and dates remain unstated. No authenticated flow tested. |
| `kirkland-riyadh-entry-level` | Open recruitment route | Official Riyadh careers page still publishes its entry-level legal recruiting email. Specific vacancy, eligibility, dates and mailbox delivery are unknown. No message sent. |
| `pinsent-masons-riyadh-internship-2026` | Verification pending; removed from current list | Employer index says internship open and separate COOP closed; programme page retains rolling applications, three months and 11 October start. The linked Oracle 3672 redirects to `/sites/CX_1004/job/3672` but renders blank, including after one reload. No application controls or closure message could be observed. Keep 3 October successful-verification timestamp; record today's unsuccessful availability review separately. |
| `segal-riyadh-student-intern-2026` | Open advertised opening | Detail SG-JOB-2026-0002 remains advertised. Linked form renders with Student Intern selected and matching Applying For link. Law student, strong academics, Arabic/English and Saudi work rights. No stated deadline, duration or pay. No submission. |
| `white-case-saudi-coop-2027` | Open advertised programme, deadline imminent | AllHires names January 2027 intake and 30/10/2026 without its Deadline passed label. Employer programme page links to this portal. Closing time/timezone and COOP-specific thresholds remain unknown. Login is required for selection/submission. |
| `white-case-saudi-law-trainee-2027` | Open advertised programme | AllHires names March 2027 and 08/01/2027 without Deadline passed. Employer details retain Saudi-university LLB, GPA 3.5/4 or 4.5/5, native Arabic and Saudi qualification aims; international LLM before associate consideration. Login required beyond public entry. |

### Official sources

- [A&O posting](https://careers.aoshearman.com/en/job/riyadh/co-op-scheme-winter-2026/3392/44638109504) and [linked application](https://jobs.aoshearman.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobDetails&partnerid=30147&siteid=5040&jobid=98119).
- [Latham COOP](https://eume-earlyassociatecareers-lw.icims.com/jobs/11016/general-opportunity%3A-graduate-training-program-%28coop%29---riyadh/job) and [trainee](https://eume-earlyassociatecareers-lw.icims.com/jobs/11015/general-opportunity%3A-trainee-associate---riyadh/job). Apply led to the corresponding job-specific `/login` screens; session and iframe parameters are not published as canonical links.
- [Kirkland Riyadh](https://www.kirkland.com/careers/asia/saudi-arabia): `RY_Entry-Level_Legal_Recruiting@kirkland.com`.
- [Pinsent Saudi index](https://www.pinsentmasons.com/careers/early-talent/saudi-arabia), [internship detail](https://www.pinsentmasons.com/careers/early-talent/saudi-arabia/internship-programme), [linked Oracle destination](https://ehpy.fa.em5.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1004/jobs/preview/3672). Browser accessibility tree and screenshot were blank after reload; web retrieval also could not inspect the ATS. This is a verification limitation, not a claim of a universally broken destination.
- [Segal detail](https://www.segal.com.sa/en/careers/jobs/student-intern) and [role-selected application](https://www.segal.com.sa/en/careers/apply?job=student-intern).
- [White & Case programme details](https://www.whitecase.com/careers/locations/saudi-arabia/saudi-law-trainee-program) and [public AllHires programme/deadline list](https://whitecase.grad.allhires.com/app/).

## Publication and visibility

The canonical live GitHub Pages site displayed zero current records and all eight records in an expanded Verification watch and archive. That is the intended 24-hour safeguard, not feed loss. The headline incorrectly suggested unmatched filters and displayed Clear filters even with none selected; plural grammar was also incorrect. Correct these without exposing overdue records as current.

The initial partition was captured only once, so a page left open could retain Apply links after evidence expired; a later filter render could remove cards without updating the watch section or source-checked counter. Recompute partitions/counts at render, schedule the next known transition and refresh after suspension/history restoration. Do not renew timestamps. Browser regressions cross the 24-hour window with a controlled clock and verify that the current link disappears, the record moves to watch and counts update.

White & Case COOP has an earlier editorial `review_due_at` of 30 October 21:00 UTC (start of 31 October Riyadh). This changes display to Verification due; it does not claim that the employer closes at that instant. Exact `deadline_at` remains null for all ambiguous source-local deadlines. A fresh review cannot extend the 24-hour global window.

The 42-employer ledger retains all eight records for provenance. Its historical count fields include pending records and must not be treated as live vacancy totals. The private monitor, source fingerprints, review-only publication separation and GitHub PR-to-main workflow are untouched.

## Validation and publication requirements

Run the publication validator and controlled mutation tests. Require PR source validation and Chromium desktop/mobile plus WebKit mobile journey checks before merge. The browser suite verifies the actual feed's partition, no Apply links on pending records, same-tab actions, empty state, time-based downgrade, editorial cutoff, filters and feed-failure handling. Browser fixtures are synthetic and do not constitute employer verification.

After merge, require the existing Deploy independent site workflow and subsequent deployed-browser checks. The final PR/run records establish completion; this evidence note does not pre-claim their outcome. No unrelated warning in private issue #37 is resolved or closed by this review.
