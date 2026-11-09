import {DEFAULT_SETTINGS,MAX_RECEIPT_BYTES,validateSettings,parseReceiptText,inspectReceipt,createSettingsExport} from './model.mjs';
const $=id=>document.getElementById(id);
const form=$('settings-form'),audit=[];
let receipt=null,inspection=null,importGeneration=0,exportPending=false;
function notice(message,error=false) {
  $('notice').textContent=message;
  $('notice').classList.toggle('error',error);
}
function log(action,detail) {
  audit.push({at:new Date().toISOString(),action,detail});
  if(audit.length>100) audit.shift();
  const list=$('activity-list'); list.replaceChildren();
  for(const item of [...audit].reverse()) {
    const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');
    time.dateTime=item.at; time.textContent=new Date(item.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    text.textContent=item.detail; li.append(time,text); list.append(li);
  }
}
function draft() {
  return {...DEFAULT_SETTINGS,
    verification_interval_hours:form.elements.verification_interval_hours.valueAsNumber,
    snapshot_max_age_hours:form.elements.snapshot_max_age_hours.valueAsNumber,
    source_max_age_hours:form.elements.source_max_age_hours.valueAsNumber,
    proposed_daily_post_cap:Number(form.elements.proposed_daily_post_cap.value),
    proposed_post_time:form.elements.proposed_post_time.value,
    enabled_source_adapters:form.elements.whitecase_enabled.checked?['whitecase-programme-v1']:[]
  };
}
function validateDraft() {
  try {
    const result=validateSettings(draft());
    $('settings-error').textContent='';
    $('export-settings').disabled=exportPending;
    return result;
  } catch(error) {
    $('settings-error').textContent=error.message;
    $('export-settings').disabled=true;
    return null;
  }
}
function resetForm() {
  for(const key of ['verification_interval_hours','snapshot_max_age_hours','source_max_age_hours','proposed_daily_post_cap','proposed_post_time'])
    form.elements[key].value=DEFAULT_SETTINGS[key];
  form.elements.whitecase_enabled.checked=true;
  validateDraft();
}
const reasonLabels={
  translation_review_pending:['Translation review pending','Review the exact Arabic and English wording.'],
  unsupported_source:['Unsupported source adapter','Review the source and add a tested adapter.'],
  not_advertised_opening:['Standing recruitment route','Keep out of vacancy posts.'],
  not_open_no_automatic_reopening:['Closed or not confirmed open','Do not reopen automatically.'],
  reviewed_semantics_changed:['Reviewed facts changed','Review changed employer facts and both languages.'],
  duplicate_identity:['Duplicate identity','Reconcile both records; do not post either.'],
  invalid_existing_evidence:['Invalid evidence date','Inspect the dated source receipt.'],
  editorial_deadline_cutoff:['Editorial recheck deadline passed','Obtain current source evidence.'],
  application_uncertain:['Application entry uncertain','Recheck through an allowed route.'],
  source_facts_changed_or_uncertain:['Source facts uncertain','Hold until source review is complete.'],
  retrieval_or_receipt_failed:['Retrieval or evidence failed','Inspect the bounded request result.'],
  verification_uncertain:['Verification uncertain','Keep quarantined; do not infer availability.'],
  publication_disabled:['Publication disabled','A separate release approval is needed.'],
  discovery_requires_supported_source_review:['Unverified discovery','Review employer source and add supported facts.'],
  employer_closed:['Employer says closed','Do not post this programme.']
};
function clearReceipt(message='No receipt loaded.') {
  receipt=null;inspection=null;
  $('freshness').textContent='No receipt';
  $('freshness-detail').textContent='Last run not observed';
  $('preview-count').textContent='—';
  $('verification-stage').textContent='Import receipt';
  $('queue-count').textContent='No receipt';
  $('receipt-meta').textContent=message;
  $('queue-empty').hidden=false;
  $('quarantine-table').hidden=true;
  $('quarantine-rows').replaceChildren();
  $('preview-list').replaceChildren();
}
function renderReceipt(result) {
  $('freshness').textContent=result.fresh?'Fresh preview':'Expired preview';
  $('freshness-detail').textContent=result.fresh?'Not ready to post':'Recheck required; do not reuse';
  $('preview-count').textContent=String(result.previews.length);
  $('verification-stage').textContent=result.previews.length+' reported preview'+(result.previews.length===1?'':'s');
  $('queue-count').textContent=result.quarantine.length+' held';
  $('receipt-meta').textContent='Imported receipt · integrity passed, origin not verified. Generated '+result.generated_at+
    ' · expires '+result.expires_at+' · SHA-256 '+result.sha256;
  $('queue-empty').hidden=true;
  $('quarantine-table').hidden=result.quarantine.length===0;
  const rows=$('quarantine-rows'); rows.replaceChildren();
  for(const q of result.quarantine) {
    const tr=document.createElement('tr'),[reason,action]=reasonLabels[q.reason]??[q.reason,'Inspect the source check; keep this record withheld.'];
    for(const text of [q.id??('Discovery candidate '+q.candidate_index),reason,action]) {
      const td=document.createElement('td');td.textContent=text;tr.append(td);
    }
    rows.append(tr);
  }
  const previews=$('preview-list');previews.replaceChildren();
  for(const preview of result.previews) {
    const details=document.createElement('details'),summary=document.createElement('summary'),note=document.createElement('p'),pre=document.createElement('pre');
    summary.textContent='Draft bilingual preview · '+preview.rendered.title;
    note.textContent='Imported text only. Translation approval and employer authenticity are not established by this file. This is not a publishable post.';
    note.className='small';
    pre.textContent=preview.rendered.text;pre.dir='auto';
    details.append(summary,note,pre);previews.append(details);
  }
}
$('receipt-file').addEventListener('change',async event=>{
  const generation=++importGeneration,file=event.target.files?.[0];
  clearReceipt('Checking imported file…');
  if(!file) {clearReceipt();notice('No receipt selected.');return;}
  notice('Checking receipt structure, integrity and freshness…');
  try {
    if(file.size>MAX_RECEIPT_BYTES) throw new Error('Receipt exceeds the 256 KB limit.');
    const candidate=parseReceiptText(await file.text());
    const result=await inspectReceipt(candidate);
    if(generation!==importGeneration) return;
    receipt=candidate;inspection=result;renderReceipt(result);
    log('receipt_imported','Imported disabled preview receipt '+result.sha256.slice(0,12)+'.');
    notice(result.fresh?'Receipt integrity passed. Fresh preview only; zero posts accepted. Origin is not verified.':'Receipt integrity passed, but it has expired. Recheck the sources before further review.',!result.fresh);
  } catch(error) {
    if(generation!==importGeneration) return;
    clearReceipt('Import rejected. No receipt is active.');
    notice('Import rejected: '+error.message,true);
  } finally {
    if(generation===importGeneration) event.target.value='';
  }
});
async function refreshFreshness() {
  if(!receipt) return;
  const generation=importGeneration,current=receipt;
  try {
    const next=await inspectReceipt(current);
    if(generation!==importGeneration||current!==receipt) return;
    const becameStale=inspection?.fresh&&!next.fresh;
    inspection=next;
    // Preserve open preview details during periodic freshness refresh.
    $('freshness').textContent=next.fresh?'Fresh preview':'Expired preview';
    $('freshness-detail').textContent=next.fresh?'Not ready to post':'Recheck required; do not reuse';
    if(becameStale) notice('This receipt has expired. No live action was taken; recheck the sources.',true);
  } catch(error) {
    if(generation!==importGeneration||current!==receipt) return;
    clearReceipt('Receipt no longer passes inspection.');notice(error.message,true);
  }
}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',()=>{validateDraft();$('draft-state').textContent='Edited · not applied';});
form.addEventListener('change',event=>{
  validateDraft();log('settings_changed','Draft setting edited: '+event.target.name+'.');
});
$('reset-draft').addEventListener('click',()=>{
  resetForm();$('draft-state').textContent='Reset · not applied';
  log('draft_reset','Restored safe proposal defaults.');notice('Local draft reset. Live operations were not changed.');
});
$('export-settings').addEventListener('click',async()=>{
  const settings=validateDraft();if(!settings||exportPending)return;
  exportPending=true;validateDraft();
  try {
    log('export_requested','Requested a proposed-settings file; nothing applied.');
    const result=await createSettingsExport(settings,{receiptSha256:inspection?.sha256??null,audit:[...audit]});
    const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='saudilaw-settings-proposal-'+result.exported_at.slice(0,10)+'.json';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('draft-state').textContent='Export prepared · not applied';
    notice('Settings file prepared for download. No live settings changed.');
  } catch(error) {notice('Export failed: '+error.message,true);}
  finally {exportPending=false;validateDraft();}
});
setInterval(refreshFreshness,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFreshness();});
window.addEventListener('focus',refreshFreshness);
resetForm();
