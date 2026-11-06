import {createHash} from 'node:crypto';
import {readHtml, find, textOf} from './html-evidence.mjs';

export const WHITE_CASE_PROGRAMME_URL = 'https://www.whitecase.com/careers/locations/saudi-arabia/saudi-law-trainee-program';
const approvedHash = '9653496d8f37f1171d3967f9e2230ddff96ca0c575582737da324f762491ec40';
const hash = text => createHash('sha256').update(text).digest('hex');

// The production instance is bound to the full reviewed programme article,
// including Saudi LLB, GPA, Arabic and international LLM requirements.
// Test instances use short synthetic text instead of copying employer content.
export function createWhiteCaseFactsCheck({articleHash = approvedHash} = {}) {
  return async function check(record, {retrieve}) {
    const evidence = [];
    const pending = reason => ({outcome:'verification_pending', result:'unverified', reason, evidence});
    if (record.firm_careers_url !== WHITE_CASE_PROGRAMME_URL) return pending('The White & Case programme-facts URL changed; editorial review is required.');
    const response = await retrieve(WHITE_CASE_PROGRAMME_URL);
    evidence.push({request_url:WHITE_CASE_PROGRAMME_URL,final_url:response.url ?? null,status:response.status ?? null,body_sha256:response.body_sha256 ?? null,body_bytes:response.body_bytes ?? null});
    if (response.error || response.status !== 200 || response.url !== WHITE_CASE_PROGRAMME_URL || !/text\/html/i.test(response.contentType || '') || typeof response.body !== 'string') return pending(`The application portal is readable, but programme eligibility could not be checked (${response.error || `HTTP ${response.status ?? 'unknown'}`}).`);
    const articles = find(readHtml(response.body),node => node.tag === 'article' && (node.attrs.class || '').split(/\s+/).includes('section-landing-page'));
    if (articles.length !== 1 || hash(textOf(articles[0])) !== articleHash) return pending('White & Case programme facts changed from the reviewed first-party article; no verification timestamp was renewed.');
    return {outcome:'verified',evidence,reason:'The separate first-party Saudi Law Trainee programme article also retains its reviewed programme and eligibility facts.'};
  };
}
export const verifyWhiteCaseProgrammeFacts = createWhiteCaseFactsCheck();
