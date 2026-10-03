# Integrated local preview — 3 October 2026

**Follow-up:** The White & Case hold and six-record count below are superseded by `editorial-disposition-2026-10-03.md`: both programmes are now promoted locally after official-detail review and isolated eight-record acceptance. This document retains the earlier validation history.

## Working implementation

The working copy is based on Segal PR #5 at `ede37b0322ca0d7cb19542ca66fbdc6658a64a78`, with the reviewed five-record editorial corrections applied. Main remains `93a60077691fe1800d92ca5991f91604b36f3271`; both remote heads were rechecked during this continuation. Segal's record and registry additions remain intact. The previous base-specific archive is historical; this working copy includes the additional preview-server repair and acceptance test.

Run `npm run dev` from this checkout. The local preview listens only on `127.0.0.1:4173`, supports `/` and `/Legal-Market-Monitor/`, and retains `/__qa`. A Windows-specific containment check previously compared native backslash paths with a forward slash and returned 403 for every asset. It now uses the platform separator, supports the production repository prefix, and rejects encoded traversal. No hosting configuration changed.

## Acceptance evidence

`scripts/preview-acceptance.mjs` exercises the persistent preview using its real feed, without response interception or synthetic freshness timestamps. Chromium desktop, Chromium mobile and WebKit mobile passed:

- Root, repository-prefix, QA and supporting-asset routes; prefix redirect, missing-route 404 and encoded traversal rejection.
- All six actual records, including Segal; exact application/source URLs and same-tab targets.
- A&O's 14 September opening date and 30 November 2026 at 5pm closing wording with the unstated-timezone qualification.
- Pinsent's 11 October start, three-month duration, allowance disclosure, future full-time wording and unknown concurrent-employment compatibility.
- Combined Latham/trainee filters, zero results for an incompatible Segal/trainee combination, reset, no horizontal overflow and no page errors.

The acceptance test intentionally requires all six records to be fresh at execution time; after the 24-hour window it must fail rather than silently renew editorial timestamps. Source-link checks prove the app's destinations, not completion of employer applications. No application, login or account change was performed.

## Remaining source reviews from alerts #9 and #10

Both private issues were read and remain open. Browser observations below were made in an isolated headless Chromium session at 09:17–09:20 UTC on 3 October. They resolve the bounded page reviews to the extent public access permits; they do not clear collection warnings or close the whole issue.

| Employer | First-party evidence and decision |
| --- | --- |
| AS&H Clifford Chance | The [Saudi-filtered job search](https://jobs.cliffordchance.com/jobs?options=219&page=1) returned three Riyadh roles: BD Client Development Manager / Senior Manager, Senior Associate Corporate Transactions & Advisory, and Senior Project Finance Associate. The [corporate role](https://jobs.cliffordchance.com/job/senior-associate-corporate-transactions-and-advisory-in-riyadh-jid-2907) requires 7–8 years' post-qualification experience. The [finance role](https://jobs.cliffordchance.com/job/senior-project-finance-associate-in-riyadh-jid-2721) is explicitly senior. No in-scope junior Saudi vacancy was established in this search. Regional early-career material does not prove a Saudi-based intake; retain `no_record_displayed`, not “no vacancies.” |
| White & Case | The employer's [Saudi careers page](https://www.whitecase.com/careers/locations/saudi-arabia) links to [AllHires](https://whitecase.grad.allhires.com/app/). The public AllHires screen returned HTTP 200 and lists **Saudi COOP Internship 2027 — January 2027 — 30/10/2026**, and **Saudi Law Trainee Program 2027 — March 2027 — 08/01/2027**, under its deadlines heading. Preserve those strings; no exact time or timezone is supplied. Starting an application requires an email/login. The employer landing page was readable through web retrieval but returned 403 in the isolated browser; disclose the access difference. These are two first-party programme candidates for editorial promotion, not “no openings.” No new card is promoted in this bounded implementation: role-specific eligibility, exact city and authenticated application selection were not inspected. Existing schema can retain unknowns if the editor approves publication with those limitations. |
| Khoshaim & Associates | [Official site](https://www.khoshaim.com/) returned HTTP 200 and invites spontaneous applications through Join Us. The inspected position selector contained only its placeholder; no named vacancy or deadline was established. Keep the general route in coverage and retain `no_record_displayed`; do not interpret a working form as confirmed headcount. No form was submitted. |
| Hourani / ZH Partners | [Careers](https://houranipartners.com/careers/) returned HTTP 200, describes regional training/internship routes, and offers a general form with Riyadh, Jeddah and Khobar choices plus careers@houranipartners.com. The [regulatory notice](https://houranipartners.com/regulatory-notice/) identifies ZH Partners as a separately regulated Saudi firm. No dated Saudi intake or employing-entity allocation was established. Retain the employer/intake review gate and `no_record_displayed`. The careers page's regulatory assertions were not independently certified. |

A&O and Ashurst findings from the earlier review remain documented in `source-review-2026-10-03.md`. This continuation does not pretend to establish the exact historical content delta that triggered each issue; old page snapshots were not compared. DLA Piper 429, Freshfields unreadable-content, Kirkland unreadable-content and Al Tamimi 500 monitor warnings remain unresolved by these local UI checks.

## Exact publication prerequisites

1. Obtain explicit publication approval; this continuation authorizes local development only.
2. Recheck remote main and PR #5, resolve the approved Segal merge/base order, and review the final combined diff. Do not apply both historical base-specific patches.
3. At publication time, reverify every record outside the 24-hour window, including Segal. Keep the A&O timezone qualification until a first-party timezone is stated.
4. Decide whether to promote the two White & Case programme candidates with clearly unknown fields, or complete role-specific review first. Do not infer city, eligibility, opening date or exact cutoff instant from the deadline list.
5. Run build and browser acceptance on the exact publishing revision, then use the repository's PR review/merge and deployment gates. No direct push to main is part of this work.
6. Keep monitor health warnings and partially reviewed issues open until their own evidence is resolved. Local preview success is not a collector repair or successful alert-delivery test.

The optional native ChatGPT alert link remains unset, as already configured. Manual setup is available; recipient task activation is not claimed. Newsletter work is separate from this repository and is not represented as completed by this preview.
