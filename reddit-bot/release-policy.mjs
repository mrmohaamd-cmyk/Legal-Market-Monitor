// Release gates are source-controlled, never read from forms, settings or environment.
// Changing either gate requires the separately approved deployment/testing step.
export const RELEASE_POLICY = Object.freeze({
  productionPosting: false,
  privateTestPosting: true,
  // Recorded predecessor releases 0.0.1–0.0.3 could not post or write a ledger.
  bootstrapEmptyLedger: true
});
