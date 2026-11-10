// Reviewed coverage and draft copy only. No entry here authorizes publication.
import data from './coverage-catalogue-data.json' with {type:'json'};
import exclusions from './coverage-exclusions.json' with {type:'json'};
import {WHITE_CASE} from './catalogue.mjs';
import {digest,translationDigest,renderBilingual} from '../../contracts/reviewed-content.mjs';
export const SOURCE_COVERAGE_DISPOSITIONS=Object.freeze(exclusions);
const render=(entry,checkedAt)=>({title:entry.copy.titleAr+' | '+entry.copy.titleEn,text:
 `**العربية**\n\n${entry.copy.summaryAr}\n\n${entry.copy.deadlineAr}\n\n${entry.copy.applicationNoteAr}\n\n**English**\n\n${entry.copy.summaryEn}\n\n${entry.copy.deadlineEn}\n\n${entry.copy.applicationNoteEn}\n\n[التفاصيل / Details](${entry.facts.source_url}) · [التقديم / Apply](${entry.facts.application_url})\n\nالتحقق / Checked: ${checkedAt}`});
const additional=data.map(e=>({id:e.id,identity:e.identity,record:e.record,facts:e.facts,
 translationSha256:digest({schema:'saudilaw-coverage-copy/v1',identity:e.identity,record:e.record,facts:e.facts,copy:e.copy}),renderingVersion:'saudilaw-coverage-render/v1',renderDraft:at=>render(e,at),
 sources:[{url:e.facts.source_url,role:'vacancy',kind:'browser_dom'},{url:e.facts.application_url,role:'application',kind:'browser_dom',...(e.id.startsWith('ao-')?{permittedFinalUrls:[e.facts.application_url+'#jobDetails=98119_5040']}: {})}],
 applicationResult:e.id.startsWith('ao-')?'login_required':'form_available',editorialCutoffAt:e.facts.deadline.date?e.facts.deadline.date+'T00:00:00.000Z':null}));
// Date-only editorial cutoff is conservative; never an inferred employer instant.
additional.find(e=>e.id.startsWith('ao-')).editorialCutoffAt='2026-11-29T21:00:00.000Z';
export const SOURCE_COVERAGE_CATALOGUE=Object.freeze([{id:WHITE_CASE.id,identity:WHITE_CASE.identity,record:WHITE_CASE.reviewedRecord,facts:WHITE_CASE.facts,
 translationSha256:translationDigest(WHITE_CASE),renderingVersion:'saudilaw-weekly-render/v1',renderDraft:at=>{const {title,text}=renderBilingual(WHITE_CASE,at);return {title,text};},
 sources:[{url:WHITE_CASE.reviewedRecord.source_url,role:'application',kind:'http_html'},{url:WHITE_CASE.reviewedRecord.firm_careers_url,role:'programme',kind:'http_html'}],applicationResult:'login_required',editorialCutoffAt:WHITE_CASE.facts.deadline.editorial_cutoff},...additional]);
