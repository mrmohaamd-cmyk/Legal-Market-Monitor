# Seven-day verification window - 6 November 2026

After the initial repair, the owner requested: "Can we extend the window to 7 days?" The prepared feed now sets `verification_window_hours` to **168**. Both successful source verification and successful application-route evidence must be no older than seven days. At exactly 168 hours the record remains within the window; immediately afterward it becomes **Verification due**, loses its current application action and moves to the review list. Age alone never changes a record to Closed.

Explicit closure evidence, known passed deadlines, failed availability checks and earlier editorial review cutoffs still take priority. The six-hour source-check schedule is unchanged. Changing the freshness policy does not establish a new verification: all eight record objects and `generated_at` are unchanged from the previous repair revision.

The public validator and automatic checker require the configured 168-hour policy. The private monitor accepts valid explicit feed windows up to 168 hours, so it can continue reading the still-deployed 24-hour feed accurately until the public repair is merged. Missing or invalid configuration remains unverified; the private monitor does not silently substitute a longer window.

Historical reports, including `automated-source-check-2026-11-06.json`, retain the actual 24-hour setting used during their recorded live checks. They are evidence of that run, not the current policy. No new live source check was performed or claimed merely to change the window.

Verification covers both sides of the exact seven-day boundary, continuing availability after the former daily limit, stale application evidence, unchanged closure/deadline handling, and browser movement into Verification due without a reload. Draft PRs remain review-gated; no merge or deployment is included in this policy change.

The follow-up passed 50 public tests, full publication validation, 52 private tests, and local Chromium mobile/desktop journeys. An explicit comparison with the preceding repair commit confirmed that the entire feed, including all record facts and dates, differs only in its verification-window setting. Historical automated-source evidence and the private source-state ledger remain unchanged.
