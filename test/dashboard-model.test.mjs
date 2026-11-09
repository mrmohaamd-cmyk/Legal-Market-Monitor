import test from 'node:test';
import assert from 'node:assert/strict';
import {WHITE_CASE} from '../scripts/pipeline/catalogue.mjs';
import {compilePipeline} from '../scripts/pipeline/core.mjs';
import {DEFAULT_SETTINGS,validateSettings,inspectReceipt,createSettingsExport,digest,timestamp,parseReceiptText} from '../tools/saudilaw-control/model.mjs';

const NOW=Date.parse('2026-11-09T16:00:00Z'),at=new Date(NOW).toISOString();
const defaults=()=>structuredClone(DEFAULT_SETTINGS);
const evidence=url=>({request_url:url,final_url:url,status:200,checked_at:at,body_sha256:'a'.repeat(64),body_bytes:10});
async function receipt() {
  const record={...structuredClone(WHITE_CASE.reviewedRecord),last_verified_at:at,last_reviewed_at:at,application_check:{checked_at:at,result:'login_required'}};
  return compilePipeline({feed:{generated_at:at,verification_window_hours:168,records:[record]},now:NOW,
    verify:async()=>({ok:true,checked_at:at,application_result:'login_required',review_due_at:WHITE_CASE.facts.deadline.editorial_cutoff,
      evidence:[evidence(record.source_url),evidence(record.firm_careers_url)]})});
}
async function reseal(value) {delete value.sha256;value.sha256=await digest(value);return value;}
test('settings defaults are disabled and returned copies cannot mutate defaults',()=>{
  const result=validateSettings(defaults());
  assert.equal(result.publication_enabled,false);
  assert.equal(result.schedule_enabled,false);
  result.enabled_source_adapters.length=0;
  assert.equal(DEFAULT_SETTINGS.enabled_source_adapters.length,1);
  assert.throws(()=>DEFAULT_SETTINGS.enabled_source_adapters.push('other'));
});
test('only bounded meaningful proposals are accepted',()=>{
  const valid={...defaults(),verification_interval_hours:12,snapshot_max_age_hours:12,source_max_age_hours:12,proposed_daily_post_cap:0,proposed_post_time:'00:00',enabled_source_adapters:[]};
  assert.equal(validateSettings(valid).proposed_daily_post_cap,0);
  for(const change of [
    {verification_interval_hours:'6'},{verification_interval_hours:5},{verification_interval_hours:13},
    {snapshot_max_age_hours:5},{snapshot_max_age_hours:13},{source_max_age_hours:11},
    {source_max_age_hours:169},{proposed_daily_post_cap:2},{proposed_daily_post_cap:-1},
    {proposed_daily_post_cap:0.5},{proposed_post_time:'24:00'},{proposed_post_time:'9:00'},
    {proposed_post_time:'09:60'},{enabled_source_adapters:['other']},
    {enabled_source_adapters:['whitecase-programme-v1','whitecase-programme-v1']}
  ]) assert.throws(()=>validateSettings({...defaults(),...change}));
});
test('schema and fixed scope cannot be widened by exported settings',()=>{
  for(const change of [{extra:true},{publication_enabled:true},{schedule_enabled:true},{destination:'r/other'},
    {language:'en'},{timezone:'UTC'},{mode:'live'},{quarantine_policy:'publish'},
    {unknown_submission_policy:'retry'},{duplicate_policy:'repost'}])
    assert.throws(()=>validateSettings({...defaults(),...change}));
  const missing=defaults();delete missing.language;assert.throws(()=>validateSettings(missing));
  assert.throws(()=>validateSettings([]));
});
test('fresh receipt remains explicitly unconnected, untrusted and not publishable',async()=>{
  const result=await inspectReceipt(await receipt(),{now:NOW});
  assert.equal(result.health,'fresh_preview');
  assert.equal(result.fresh,true);
  assert.equal(result.originVerified,false);
  assert.equal(result.publicationConnected,false);
  assert.equal(result.publishable,false);
  assert.equal(result.previews.length,1);
});
test('expiry boundary changes freshness without hiding historical evidence',async()=>{
  const r=await receipt();
  assert.equal((await inspectReceipt(r,{now:NOW+12*3600000-1})).fresh,true);
  const expired=await inspectReceipt(r,{now:NOW+12*3600000});
  assert.equal(expired.health,'expired_preview');
  assert.equal(expired.previews.length,1);
  assert.equal(expired.publishable,false);
});
test('digest mismatch, future generation and excessive freshness windows reject',async()=>{
  const modified=await receipt();modified.generated_at='2026-11-09T17:00:00.000Z';
  await assert.rejects(inspectReceipt(modified,{now:NOW}),/integrity/);
  await reseal(modified);await assert.rejects(inspectReceipt(modified,{now:NOW}),/freshness/);
  const long=await receipt();long.expires_at='2026-11-10T05:00:00.000Z';await reseal(long);
  await assert.rejects(inspectReceipt(long,{now:NOW}),/freshness/);
});
test('self-consistent hash does not authorize publication or prove valid evidence',async()=>{
  for(const mutate of [
    r=>{r.publication_enabled=true;},r=>{r.accepted=[r.previews[0]];},
    r=>{r.policy_version='new-policy';},r=>{r.previews.push(structuredClone(r.previews[0]));},
    r=>{r.previews[0].provenance[0].request_url='https://unapproved.example/';},
    r=>{r.previews[0].provenance[0].body_sha256='bad';},
    r=>{r.previews[0].checked_at='2026-11-09T17:00:00.000Z';},
    r=>{r.previews[0].rendered.text+=' changed';},
    r=>{r.quarantine[0].reason='<script>bad</script>';}
  ]) {
    const value=await receipt();mutate(value);await reseal(value);
    await assert.rejects(inspectReceipt(value,{now:NOW}));
  }
});
test('plain imported HTML text is data; directional control spoofing rejects',async()=>{
  const value=await receipt(),rendered=value.previews[0].rendered;
  rendered.text='<img src=x onerror=alert(1)> Plain imported text only.';
  rendered.content_sha256=await digest({title:rendered.title,text:rendered.text});await reseal(value);
  assert.equal((await inspectReceipt(value,{now:NOW})).previews[0].rendered.text,rendered.text);
  rendered.title+='\u202e';rendered.content_sha256=await digest({title:rendered.title,text:rendered.text});await reseal(value);
  await assert.rejects(inspectReceipt(value,{now:NOW}),/text integrity/);
});
test('invalid, impossible, oversized or non-JSON inputs reject before use',()=>{
  for(const text of ['not json','{"x":',' '.repeat(256001)]) assert.throws(()=>parseReceiptText(text));
  for(const value of ['2026-02-30T00:00:00Z','2026-11-09','2026-11-09T16:00:00+03:00']) assert.throws(()=>timestamp(value));
  assert.throws(()=>validateSettings({...defaults(),source_max_age_hours:NaN}));
});
test('settings exports record proposal only, bind audit/settings and reject forged audit',async()=>{
  const audit=[{at,action:'settings_changed',detail:'Draft daily cap edited.'}];
  const result=await createSettingsExport({...defaults(),proposed_daily_post_cap:0},{now:NOW,receiptSha256:'a'.repeat(64),audit});
  assert.equal(result.applied,false);assert.equal(result.settings.publication_enabled,false);
  const {sha256,...payload}=result;assert.equal(await digest(payload),sha256);
  const changed=await createSettingsExport(defaults(),{now:NOW,audit});
  assert.notEqual(changed.sha256,sha256);
  for(const bad of [[{at,action:'posted',detail:'pretend'}],[{at:'2026-11-10T00:00:00Z',action:'draft_reset',detail:'future'}],Array(101).fill(audit[0])])
    await assert.rejects(createSettingsExport(defaults(),{now:NOW,audit:bad}));
  await assert.rejects(createSettingsExport(defaults(),{now:NOW,receiptSha256:'not-a-hash'}));
});

test('source/editorial expiry takes priority over a later snapshot expiry',async()=>{
  const r=await receipt();
  r.previews[0].expires_at=new Date(NOW+3600000).toISOString();
  await reseal(r);
  assert.equal((await inspectReceipt(r,{now:NOW+3600000-1})).fresh,true);
  const result=await inspectReceipt(r,{now:NOW+3600000});
  assert.equal(result.health,'expired_preview');
  assert.equal(result.fresh,false);
  assert.equal(result.effective_expires_at,r.previews[0].expires_at);
  assert.notEqual(result.effective_expires_at,result.expires_at);
});
