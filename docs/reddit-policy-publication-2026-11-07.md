# Approved app policies published

The owner explicitly approved adoption/publication of the exact terms and privacy drafts at commit `767feb04dce6dac05149434a50e6dff2b01762e5`, including the verified Reddit operator and r/SaudiLaw modmail, and adding their public links to app details.

## Published documents

Main-branch commit **`b871dfeae8d991a8dfe35517599d08eff8cf341d`** adds only:

- [SaudiLaw Jobs terms](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-terms.md)
- [SaudiLaw Jobs privacy notice](https://github.com/mrmohaamd-cmyk/Legal-Market-Monitor/blob/main/docs/saudilaw-jobs-privacy.md)

Both are effective **7 November 2026**. The approved finalization instructions were followed: draft labels/editorial notes were removed, the effective date inserted, and the companion privacy link changed to its final URL. Substantive policy paragraphs were unchanged. No bot code, feed, source-verification date or site file was merged into main.

Both main-branch files matched the prepared final contents exactly on read-back. Unauthenticated web retrieval successfully rendered both GitHub pages with their effective date and policy content. File blob SHAs are `082b40246fe32fd14c5e2f1da3c35837a91f5006` (terms) and `294444b93f19447f41d0b8245ff27928a0b86710` (privacy).

## Reddit settings verification

At **2026-11-07T00:24:27.836Z**, a fresh official Devvit App API read confirmed both exact public URLs in app `saudilaw-jobs`, owned by `BannedForThe7thTime`. The update was acknowledged. Comparing metadata before and after showed only `termsAndConditions` and `privacyPolicy` changed; no other fields changed. The existing authorized developer session was used, with no new grant or login.

The app still had **two versions and one installation**. No app upload, app-review submission, unlisting, installation/upgrade or posting activation occurred. The description was intentionally left unchanged under this approval. The main publication does not merge draft PR #8 or unlock the bot.

## What remains

The missing-policy-URL blocker is resolved. Earlier readiness documents' statements that the URLs are empty or the notices are unadopted describe the pre-publication state and are superseded by this receipt. The original draft files remain as historical review artifacts, not the active policy URLs.

Before a review/publication operation, prepare the exact release's user-facing policy links and accurate description, preserve the destination review, and complete the relevant remaining tests. Actual posting/Redis integration and mobile/role behavior have not been established by the backend-only preview. Test posts remain separately unauthorized. Any posting release must implement/test deletion and reconciliation as disclosed by the adopted privacy notice.

Reddit app/external-link approval is not established. The inspected CLI `publish` operation uploads a new version and source, submits review and attempts immediate unlisted visibility for this app; it needs its own specific authorization. Approval of a preview release would not cover later changed posting code. Production installation and unattended posting remain off and require their own authorized release steps.
