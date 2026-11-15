# Owner feed expiry isolation

Source-only repair based on public main `473263b5679d268cecd53acc599f02a5fe59e122`.

Four consecutive refresh runs failed before producing owner-job evidence:
43648664946, 43686768120, 43692657235 and 43720138153. Their logs report
`Owner job check stopped: owner_job_upcoming_date`. Pinsent's reviewed upcoming
opening date crossed midnight Riyadh on 15 November; validation of the whole
input aborted and left the unrelated owner-job feed expired. Last successful
refresh was 43625386355. The latest bundle feed update succeeded independently.

The producer already requested `allowExpired:true`, but the job contract ignored
that option. This repair permits structurally valid expired upcoming content only
when explicitly requested, and in feed entries marked `attention_required`.
Ordinary content admission and verified feed entries retain the strict cutoff.
Expired upcoming entries preserve all reviewed content and return
`upcoming_requires_reverification`, null timestamps/application result and no
proofs, without source reads. A boundary crossed during source reads is held too.
Unrelated candidates still require their complete fresh, matching source evidence.
Malformed input still rejects before network access. Nothing promotes Pinsent to
open, changes source pins, grants approval or enables publication.

Regression coverage includes expired Pinsent with independently verified synthetic
Segal source responses, exact cutoff, crossing cutoff during a read, forged
verified status and malformed date/status/source rejection. Synthetic test bodies
are not live source verification.

Deployment sequencing: old native consumers reject any expired upcoming item,
including a held item. Carry the matching contract change into the native consumer
release before claiming this resulting feed is usable there. This source repair
does not change production feeds, install an app, dispatch a workflow or publish.
After reviewed merge, run the existing serialized refresh workflow once and verify
the exact owner-job evidence artifact, positive write receipt and remote feed blob.
Do not rerun uncertain writes. A&O's changed fingerprint needs its own source review;
the expiry fix does not resolve that hold. No current candidate is approved by this
repair. Rollback source via a reviewed revert; never reset ledger or state.
