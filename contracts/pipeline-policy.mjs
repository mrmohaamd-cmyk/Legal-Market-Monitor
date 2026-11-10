// Shared data-only policy. Safe to import in Reddit server bundles without source-fetching CLI code.
export const POLICY=Object.freeze({version:'saudilaw-pipeline-v1',publication_enabled:false,
  source_max_age_hours:168,snapshot_max_age_hours:12,max_records:100,max_candidates:1000,
  max_output_bytes:256000,max_attempts_per_utc_day:1});
