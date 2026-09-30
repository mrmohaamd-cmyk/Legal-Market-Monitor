# Saudi employer coverage review — 30 September 2026

## Correction and root cause

Pinsent Masons was already included in both 33-firm registries. An empty code-search result was incorrectly treated as proof of absence. Direct file inspection established that the private monitor watched the global careers landing page, not the Saudi programme index or individual programme pages. A configured firm, a successful HTTP response and actual vacancy discovery are different evidence levels.

## Publication decision

The employer's Saudi index marks the internship open and its separate cooperative training programme closed. The internship detail was retrieved successfully at 2026-09-30T08:38:53Z. Its Apply Now links point to Oracle job 3672 in CX_1004. The published record preserves the actual source wording: September opening month, rolling applications, 11 October 2026 start, three-month duration, 2.5/4 minimum GPA or equivalent and an unspecified monthly allowance. No application was submitted. Future employment consideration is not a job guarantee.

The LinkedIn relative posting age is not used as an application-opening date. The existing four records and their verification timestamps are unchanged; the 24-hour freshness rule still applies. An old published route is not relabelled freshly verified because the registry expanded.

## Employer universe

The original 33 targets are retained. Eight additional targets have dated presence and recruitment evidence in `dist/coverage-audit.json`: Dentons, Ashurst Perkins Coie, HFW, Al Tamimi & Company, Khoshaim & Associates, Hammad & Al-Mehdar, Z&Co., and ZH Partners. The Hourani recruitment channel is distinguished from the separately regulated Saudi ZH Partners employer. General recruitment forms are not vacancies. Z&Co. requires manual review where automated access is blocked. Applicant-tracking portals may require browser review.

This is a bounded expansion to 41 search targets, not an exhaustive market census or 41 fully automated vacancy feeds. Unresolved employer identities and Saudi employment routes remain in the research backlog rather than becoming asserted coverage.

## Validation and publication safeguards

The build validates source/application allowlists, all 41 unique targets, preservation of the original 33, one coverage-ledger reference per published record, the exact Pinsent application destination, rolling/date precision, separate COOP status, freshness expiry, action routing, portable links and setup-prompt parity. Temporary preparation scripts and write workflows have been removed after the generated changes passed validation.

The private collector remains review-only; it does not publish listings. This repository's existing review-and-deploy workflow remains the publication route. GitHub Pages is canonical. The independent legacy ChatGPT Sites deployment is not automatically synchronized by these changes.
