# Publication source review — 6 November 2026

The eight retained records were reviewed against live first-party sources and public application entry points. Coordinated browser checks completed at 11:45 UTC; independent HTTP checks for Latham and Kirkland completed at the individual times below. `generated_at` is the latest completed record check, not evidence that all employers were checked at that instant. No login, account creation, consent, message, upload or application submission was performed.

The feed retains the 24-hour freshness safeguard. Six records have supported current application or recruitment routes; White & Case COOP is affirmatively closed; Pinsent remains unavailable for current publication. Three of the six are standing recruitment routes, so the count is not six confirmed immediate vacancies.

| Record | Result and evidence | Checked UTC |
| --- | --- | --- |
| A&O Winter COOP | [Vacancy 11180BR](https://careers.aoshearman.com/en/job/riyadh/co-op-scheme-winter-2026/3392/44638109504) and its [BrassRing job 98119](https://jobs.aoshearman.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobDetails&jobid=98119&partnerid=30147&siteid=5040) remain available; browser Apply journey reaches sign-in. Deadline still 30 November at 5pm, timezone unstated. | 11:45 |
| Latham COOP | [iCIMS 11016](https://eume-earlyassociatecareers-lw.icims.com/jobs/11016/general-opportunity%3A-graduate-training-program-%28coop%29---riyadh/job) retains its general recruitment route. Exact Apply link returned HTTP 200 with role-specific email/profile entry; browser check agreed. | 11:46:32 |
| Latham trainee | [iCIMS 11015](https://eume-earlyassociatecareers-lw.icims.com/jobs/11015/general-opportunity%3A-trainee-associate---riyadh/job) retains its general two-year trainee route. Exact Apply link returned HTTP 200 with role-specific email/profile entry; browser check agreed. | 11:46:36 |
| Kirkland entry-level | [Official Riyadh careers](https://www.kirkland.com/careers/asia/saudi-arabia) returned HTTP 200 and still publishes `RY_Entry-Level_Legal_Recruiting@kirkland.com`. Mailbox delivery and immediate headcount are untested. | 11:46:53 |
| Pinsent internship | [Saudi index](https://www.pinsentmasons.com/careers/early-talent/saudi-arabia) says internship open and separate COOP closed. [Programme details](https://www.pinsentmasons.com/careers/early-talent/saudi-arabia/internship-programme) retain rolling applications. [Oracle 3672](https://ehpy.fa.em5.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1004/jobs/preview/3672) redirects but renders blank in the browser; web retrieval could not inspect it. Keep `verification_pending` and the successful 3 October timestamp. A passed programme start does not prove closure. | 11:45 |
| Segal Student Intern | [SG-JOB-2026-0002](https://www.segal.com.sa/en/careers/jobs/student-intern) remains advertised. [Linked form](https://www.segal.com.sa/en/careers/apply?job=student-intern) renders with Student Intern selected and matching Applying For link in the browser. | 11:45 |
| White & Case COOP | [AllHires](https://whitecase.grad.allhires.com/app/) now explicitly marks the January 2027 intake **Deadline passed**. Set `closed`; retain previous successful open-availability timestamp. | 11:45 |
| White & Case trainee | The same portal lists the March 2027 Saudi Law Trainee intake with `08/01/2027`, without a passed-deadline label, and exposes email/login entry. [Employer details](https://www.whitecase.com/careers/locations/saudi-arabia/saudi-law-trainee-program) remain consistent. Authenticated programme selection is untested. | 11:45 |

## Date interpretation

AllHires uses day/month/year: neighboring dates `13/11/2026` and `15/11/2026` establish the format. The trainee deadline therefore reads 8 January 2027. No closing time or timezone is stated, so `deadline_at` remains null. The start of 9 January in Riyadh is an editorial recheck cutoff, not an invented employer closing instant. The 24-hour safeguard still takes effect first.

## Additional discovery awaiting application verification

The A&O page also links [Trainee — March 2027, 11428BR](https://careers.aoshearman.com/en/job/riyadh/trainee-march-2027/3392/46517958144), a Saudi legal training contract. Its [Apply destination is BrassRing 98541](https://jobs.aoshearman.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobDetails&jobid=98541&partnerid=30147&siteid=5040). The body describes legal work despite an HR practice-area metadata label. This is a discovery candidate, not a ninth published record: its rendered application availability was not checked in this review.

## Verification limits and publication

The local browser surface was unavailable (no IAB; the Chrome extension had no tabs and could not create windows). Coordinating browser observations supplied application-entry evidence; local web retrieval corroborated source content and fresh HTTP followed Latham's exact employer-provided iframe and Apply links. Raw A&O HTML contains hidden expired/error templates alongside the live role, so a global text match is not reliable closure evidence.

This is a bounded eight-record review, not a complete 42-employer census. No production deployment is claimed by this document. Validation, draft PR review, approved merge and deployed checks remain separate stages. Recheck any record that expires while approval is pending; never advance timestamps merely to make a PR appear current.
