const configPath = '/task-config.json';
const opportunitiesPath = '/opportunities.json';
const $ = (id) => document.getElementById(id);

const currentStatuses = new Set(['open', 'open_no_deadline', 'closing_soon']);
const statusPriority = {
  closing_soon: 0,
  open: 1,
  open_no_deadline: 2,
  verification_pending: 3,
  expired: 4,
  closed: 5
};

export const statusLabels = {
  open: 'Open',
  open_no_deadline: 'Open',
  closing_soon: 'Open',
  verification_pending: 'Verification due',
  expired: 'Closed',
  closed: 'Closed'
};

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Riyadh'
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Riyadh'
});

export function validTaskUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'chatgpt.com' && !url.username && !url.password && !url.port && /^\/s\/[A-Za-z0-9_-]+$/.test(url.pathname) && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function safeHttpsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function deriveStatus(record, windowHours, now = Date.now()) {
  if (!record) return 'verification_pending';
  if (record.status === 'closed' || record.status === 'expired') return record.status;
  const deadline = record.deadline_at ? Date.parse(record.deadline_at) : null;
  if (deadline && deadline <= now) return 'expired';
  if (record.status === 'verification_pending' || record.source_status === 'unreachable') return 'verification_pending';
  const checked = Date.parse(record.last_verified_at);
  if (!Number.isFinite(checked) || now - checked > windowHours * 60 * 60 * 1000) return 'verification_pending';
  if (deadline && deadline - now <= 14 * 24 * 60 * 60 * 1000) return 'closing_soon';
  return deadline ? 'open' : 'open_no_deadline';
}

export function isCurrentStatus(status) {
  return currentStatuses.has(status);
}

function compareRecords(a, b, windowHours, now) {
  const aStatus = deriveStatus(a, windowHours, now);
  const bStatus = deriveStatus(b, windowHours, now);
  if (statusPriority[aStatus] !== statusPriority[bStatus]) return statusPriority[aStatus] - statusPriority[bStatus];
  const aDeadline = a.deadline_at ? Date.parse(a.deadline_at) : Number.POSITIVE_INFINITY;
  const bDeadline = b.deadline_at ? Date.parse(b.deadline_at) : Number.POSITIVE_INFINITY;
  return aDeadline - bDeadline || Date.parse(b.last_verified_at) - Date.parse(a.last_verified_at);
}

export function partitionRecords(records, windowHours, now = Date.now()) {
  const result = { current: [], watch: [], archive: [] };
  for (const record of records) {
    const status = deriveStatus(record, windowHours, now);
    if (isCurrentStatus(status)) result.current.push(record);
    else if (status === 'verification_pending') result.watch.push(record);
    else result.archive.push(record);
  }
  for (const group of Object.values(result)) group.sort((a, b) => compareRecords(a, b, windowHours, now));
  return result;
}

export function filterRecords(records, active, windowHours, now = Date.now()) {
  return records.filter((record) => {
    const status = deriveStatus(record, windowHours, now);
    const statusLabel = statusLabels[status];
    return isCurrentStatus(status)
      && (!active.stage || record.career_stage === active.stage)
      && (!active.practice || record.practice_areas.includes(active.practice))
      && (!active.firm || record.firm_name === active.firm)
      && (!active.location || record.location_group === active.location)
      && (!active.status || statusLabel === active.status);
  }).sort((a, b) => compareRecords(a, b, windowHours, now));
}

export function getPrimaryAction(record, status) {
  if (!isCurrentStatus(status) || (record.source_status && record.source_status !== 'verified')) return null;
  const applicationUrl = safeHttpsUrl(record.application_url);
  if (applicationUrl) {
    return {
      href: applicationUrl,
      label: 'Apply to ' + record.firm_name,
      accessibleName: 'Apply for ' + record.role_title + ' at ' + record.firm_name,
      destinationLabel: 'Official application route',
      destinationHost: new URL(applicationUrl).hostname
    };
  }
  const sourceUrl = safeHttpsUrl(record.source_url);
  if (sourceUrl) {
    return {
      href: sourceUrl,
      label: 'View ' + record.firm_name + ' posting',
      accessibleName: 'View ' + record.firm_name + ' official posting for ' + record.role_title,
      destinationLabel: 'Official job posting',
      destinationHost: new URL(sourceUrl).hostname
    };
  }
  return null;
}

export function getFallbackAction(record) {
  const careersUrl = safeHttpsUrl(record.firm_careers_url);
  if (!careersUrl) return null;
  return {
    href: careersUrl,
    label: 'Browse firm careers',
    accessibleName: 'Browse ' + record.firm_name + ' careers',
    destinationLabel: 'Official firm careers',
    destinationHost: new URL(careersUrl).hostname
  };
}

export function sourceValue(value) {
  return typeof value === 'string' && value.trim() ? value : 'Not stated by source';
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeExternalLink(href, className, text, accessibleName) {
  const safeHref = safeHttpsUrl(href);
  if (!safeHref) return null;
  const link = makeElement('a', className, text);
  link.href = safeHref;
  link.target = '_top';
  link.referrerPolicy = 'no-referrer';
  link.setAttribute('aria-label', accessibleName);
  return link;
}

function formatDateTime(value) {
  return dateTimeFormatter.format(new Date(value)) + ' Riyadh time';
}

function formatDate(value) {
  return dateFormatter.format(new Date(value));
}

async function copyText(text, target, fallback) {
  try {
    await navigator.clipboard.writeText(text);
    target.textContent = 'Copied. ' + (fallback === 'instructions' ? 'Paste and send in ChatGPT, then review the task confirmation.' : 'The page link is ready to share.');
  } catch {
    if (fallback === 'instructions') {
      $('instructions-details').open = true;
      $('instructions').focus();
      $('instructions').select();
      target.textContent = 'Automatic copying is unavailable. The instructions are selected; use your device’s Copy command.';
    } else {
      $('share-url').hidden = false;
      $('share-url').value = text;
      $('share-url').focus();
      $('share-url').select();
      target.textContent = 'Automatic copying is unavailable. Select and copy the page link below.';
    }
  }
}

function addList(parent, heading, items, emptyText) {
  parent.append(makeElement('h4', '', heading));
  if (!Array.isArray(items) || !items.length) {
    parent.append(makeElement('p', 'source-unknown', emptyText));
    return;
  }
  const list = makeElement('ul', 'source-list');
  for (const item of items) list.append(makeElement('li', '', item));
  parent.append(list);
}

function addFact(parent, label, value, className) {
  const row = makeElement('div', className);
  row.append(makeElement('dt', '', label));
  row.append(makeElement('dd', '', sourceValue(value)));
  parent.append(row);
}

function renderActions(record, status, parent) {
  const primaryAction = getPrimaryAction(record, status);
  const actions = makeElement('div', 'opportunity-actions');
  actions.setAttribute('aria-label', 'Official opportunity action');

  if (primaryAction) {
    const action = makeExternalLink(primaryAction.href, 'button primary source-link', primaryAction.label, primaryAction.accessibleName);
    if (action) actions.append(action);
  } else {
    const message = status === 'verification_pending'
      ? 'Official-source verification is due. This record is not presented as current.'
      : 'This record is not presented as a current opportunity.';
    actions.append(makeElement('p', 'source-action-unavailable', message));
    const fallbackAction = getFallbackAction(record);
    if (fallbackAction) {
      const fallback = makeExternalLink(fallbackAction.href, 'button secondary', fallbackAction.label, fallbackAction.accessibleName);
      if (fallback) actions.append(fallback);
    }
  }
  parent.append(actions);
}

function renderOpportunity(record, windowHours) {
  const status = deriveStatus(record, windowHours);
  const card = makeElement('article', 'opportunity-card');
  card.id = 'opportunity-' + record.id;
  card.dataset.status = status;

  const top = makeElement('header', 'opportunity-top');
  const identity = makeElement('div', 'opportunity-identity');
  identity.append(makeElement('p', 'firm-name', record.firm_name));
  const title = makeElement('h3', '', record.role_title);
  title.id = card.id + '-title';
  identity.append(title);
  identity.append(makeElement('p', 'opportunity-location', record.location));
  top.append(identity);

  const freshness = makeElement('p', 'status-line status-' + status);
  freshness.append(makeElement('span', '', statusLabels[status] || status));
  top.append(freshness);
  card.setAttribute('aria-labelledby', title.id);
  card.append(top);

  // Keep the primary action in the decision sequence: identity, live status,
  // application route, then the eligibility and supporting facts.
  renderActions(record, status, card);

  const facts = makeElement('dl', 'opportunity-facts');
  const eligibilityLabel = record.eligibility_state === 'partly_stated' ? 'Eligibility — partly stated' : 'Eligibility — source';
  addFact(facts, eligibilityLabel, record.eligibility_summary, record.eligibility_state === 'partly_stated' ? 'fact-unknown' : '');
  const deadlineText = record.deadline_at ? formatDateTime(record.deadline_at) : 'No deadline stated by source';
  addFact(facts, 'Deadline', deadlineText, record.deadline_at ? '' : 'fact-unknown');
  if (record.posted_at) addFact(facts, 'Applications open', formatDate(record.posted_at), '');
  addFact(facts, 'What it offers', record.offer_summary, '');
  card.append(facts);

  const provenance = makeElement('p', 'verification-line');
  provenance.append(makeElement('span', '', record.source_type));
  provenance.append(makeElement('span', 'source-type', record.source_domain));
  card.append(provenance);

  const preview = makeElement('details', 'opportunity-preview');
  preview.append(makeElement('summary', '', 'Source facts and editorial assessment'));
  const previewBody = makeElement('div', 'preview-body');
  const sourceBlock = makeElement('section', 'source-block');
  sourceBlock.setAttribute('aria-label', 'Facts from the official source');
  sourceBlock.append(makeElement('p', 'block-label', 'FROM THE OFFICIAL SOURCE'));
  sourceBlock.append(makeElement('p', 'source-title', record.source_title));
  sourceBlock.append(makeElement('p', '', record.source_summary));
  sourceBlock.append(makeElement('h4', '', 'Eligibility as stated'));
  sourceBlock.append(makeElement('p', 'source-eligibility', sourceValue(record.eligibility_source_text)));
  addList(sourceBlock, 'Responsibilities and experience', record.responsibilities, 'Not stated by source.');
  addList(sourceBlock, 'Qualifications and requirements', record.qualifications, 'No specific qualifications or requirements are stated by source.');
  previewBody.append(sourceBlock);

  const editorial = makeElement('section', 'editorial-block');
  editorial.setAttribute('aria-label', 'Editorial assessment');
  editorial.append(makeElement('p', 'block-label', 'EDITORIAL ASSESSMENT'));
  editorial.append(makeElement('p', '', record.editorial_assessment));
  previewBody.append(editorial);

  previewBody.append(makeElement('p', 'provenance-note', 'Source note: ' + record.provenance_notes));
  const previewActions = makeElement('div', 'preview-actions');
  if (status !== 'verification_pending' && status !== 'expired' && status !== 'closed') {
    const sourceAction = makeExternalLink(record.source_url, 'text-link', 'Open official posting on ' + record.source_domain, 'Open official posting for ' + record.role_title + ' on ' + record.source_domain);
    if (sourceAction) previewActions.append(sourceAction);
  }
  const careersAction = getFallbackAction(record);
  if (careersAction) {
    const careersLink = makeExternalLink(careersAction.href, 'text-link', careersAction.label, careersAction.accessibleName);
    if (careersLink) previewActions.append(careersLink);
  }
  const linkedinUrl = safeHttpsUrl(record.firm_linkedin_url);
  if (linkedinUrl) {
    const linkedin = makeExternalLink(linkedinUrl, 'text-link', record.firm_name + ' on LinkedIn', 'Open ' + record.firm_name + ' on LinkedIn');
    if (linkedin) previewActions.append(linkedin);
  }
  if (previewActions.children.length) previewBody.append(previewActions);
  preview.append(previewBody);
  card.append(preview);
  return card;
}

function addOptions(select, values, preferredOrder) {
  const ordered = [...new Set(values)].sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    return a.localeCompare(b);
  });
  for (const value of ordered) {
    const option = makeElement('option', '', value);
    option.value = value;
    select.append(option);
  }
}

function configureWatch(groups, windowHours) {
  const watch = $('opportunity-watch');
  const title = $('opportunity-watch-title');
  const copy = $('opportunity-watch-copy');
  const list = $('opportunity-watch-list');
  const records = groups.watch.concat(groups.archive);
  if (!records.length) {
    watch.hidden = true;
    return;
  }
  watch.hidden = false;
  title.textContent = 'Verification watch and archive (' + records.length + ')';
  const pending = groups.watch.length;
  const archived = groups.archive.length;
  copy.textContent = (pending ? pending + ' record' + (pending === 1 ? '' : 's') + ' needs source re-verification' : '')
    + (pending && archived ? '; ' : '')
    + (archived ? archived + ' record' + (archived === 1 ? '' : 's') + ' is closed or past its stated deadline.' : '');
  list.replaceChildren(...records.map((record) => renderOpportunity(record, windowHours)));
}

function configureCoverageAudit(audit) {
  const panel = $('coverage-audit');
  const title = $('coverage-audit-title');
  const copy = $('coverage-audit-copy');
  const list = $('coverage-audit-list');
  if (!audit || !Array.isArray(audit.firms) || !audit.firms.length) {
    panel.hidden = true;
    return;
  }
  const groups = [
    ['current_route', 'Current source-verified route'],
    ['closed_programme', 'Known closed programme'],
    ['no_record_displayed', 'No current record displayed']
  ];
  panel.hidden = false;
  title.textContent = audit.target_firm_count + '-firm backfill coverage';
  copy.textContent = audit.scope_note;
  const sections = groups.map(([state, heading]) => {
    const firms = audit.firms.filter((firm) => firm.review_state === state).map((firm) => firm.firm_name);
    if (!firms.length) return null;
    const section = makeElement('section', 'coverage-audit-group');
    section.append(makeElement('h3', '', heading + ' (' + firms.length + ')'));
    section.append(makeElement('p', '', firms.join(' · ')));
    return section;
  }).filter(Boolean);
  list.replaceChildren(...sections);
}

async function initializeOpportunities() {
  const list = $('opportunity-list');
  const error = $('opportunity-error');
  const empty = $('opportunity-empty');
  const emptyCopy = $('opportunity-empty-copy');
  const count = $('opportunity-count');
  const clear = $('clear-filters');
  const emptyClear = $('empty-clear-filters');
  const selects = {
    stage: $('filter-stage'),
    practice: $('filter-practice'),
    firm: $('filter-firm'),
    location: $('filter-location'),
    status: $('filter-status')
  };

  try {
    const response = await fetch(opportunitiesPath, { cache: 'no-store' });
    if (!response.ok) throw new Error('Opportunity feed unavailable');
    const data = await response.json();
    if (!Array.isArray(data.records) || !Number.isFinite(data.verification_window_hours)) throw new Error('Opportunity feed invalid');
    const groups = partitionRecords(data.records, data.verification_window_hours);
    const current = groups.current;
    addOptions(selects.stage, current.map((record) => record.career_stage), ['Internship / COOP', 'Graduate / COOP', 'Trainee', 'Paralegal / analyst', 'NQ / 0–2 PQE']);
    addOptions(selects.practice, current.flatMap((record) => record.practice_areas), ['Corporate / M&A', 'Banking & finance', 'Capital markets', 'Projects', 'Disputes', 'Regulatory / fintech', 'Other']);
    addOptions(selects.firm, current.map((record) => record.firm_name), []);
    addOptions(selects.location, current.map((record) => record.location_group), ['Riyadh', 'Other Saudi location', 'Saudi-wide / unspecified']);
    addOptions(selects.status, current.map((record) => statusLabels[deriveStatus(record, data.verification_window_hours)]), ['Open']);
    configureWatch(groups, data.verification_window_hours);
    configureCoverageAudit(data.coverage_audit);

    const render = () => {
      const active = {
        stage: selects.stage.value,
        practice: selects.practice.value,
        firm: selects.firm.value,
        location: selects.location.value,
        status: selects.status.value
      };
      const hasFilters = Object.values(active).some(Boolean);
      clear.disabled = !hasFilters;
      const filtered = filterRecords(data.records, active, data.verification_window_hours);
      list.replaceChildren(...filtered.map((record) => renderOpportunity(record, data.verification_window_hours)));
      list.setAttribute('aria-busy', 'false');
      empty.hidden = filtered.length > 0;
      list.hidden = filtered.length === 0;
      count.textContent = filtered.length + ' ' + (filtered.length === 1 ? 'current opportunity' : 'current opportunities') + ' shown · ' + current.length + ' source-checked';
      if (!filtered.length) {
        const labels = Object.entries(active).filter((entry) => entry[1]).map((entry) => entry[1]);
        emptyCopy.textContent = labels.length ? 'No current record matches ' + labels.join(' + ') + '. Clear the filters to restore the source-checked list.' : 'There are no source-checked opportunities in the current feed. Set up the monitor below for future changes.';
      }
    };

    const reset = () => {
      for (const select of Object.values(selects)) select.value = '';
      render();
    };
    for (const select of Object.values(selects)) select.addEventListener('change', render);
    clear.addEventListener('click', reset);
    emptyClear.addEventListener('click', reset);
    render();
  } catch {
    list.hidden = true;
    list.setAttribute('aria-busy', 'false');
    count.textContent = 'Opportunity feed unavailable';
    error.hidden = false;
    error.textContent = 'The verified opportunity feed could not be loaded. No vacancy is being shown as current. Use the monitoring setup below or try this page again later.';
    for (const select of Object.values(selects)) select.disabled = true;
  }
}

async function initializeSetup() {
  try {
    const response = await fetch(configPath, { cache: 'no-store' });
    if (!response.ok) throw new Error('Configuration unavailable');
    const config = await response.json();
    if (typeof config.prompt !== 'string' || !config.prompt.trim()) throw new Error('Instructions unavailable');
    const setup = 'Create a separate daily monitoring task titled “' + config.title + '”. Check each morning using the Asia/Riyadh time zone. Notify me only for meaningful changes. Review any account limitations and confirm the actual schedule after creating it.\n\n' + config.prompt + '\n';
    $('instructions').value = setup;
    $('copy-prompt').addEventListener('click', () => copyText(setup, $('status'), 'instructions'));
    if (validTaskUrl(config.taskUrl)) {
      for (const id of ['primary-cta', 'native-link', 'fallback-link']) {
        const item = $(id);
        if (item) item.href = config.taskUrl;
      }
      const primary = $('primary-cta');
      if (primary) primary.innerHTML = 'Add alert to ChatGPT <span aria-hidden="true">↗</span>';
      const note = $('cta-note');
      if (note) note.textContent = 'Review the task in ChatGPT, then schedule your own copy.';
      $('native-setup').hidden = false;
      $('manual-setup').hidden = true;
    }
  } catch {
    $('copy-prompt').disabled = true;
    $('instructions').value = 'The configuration could not be loaded. Download the complete instructions using the link below.';
    $('status').textContent = 'Setup could not load. Use the downloadable instructions below, or reload this page.';
  }
}

function pageUrl() {
  return new URL('/', window.location.href).href;
}

function initializeShare() {
  $('share-page').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Saudi Legal Opportunities',
          text: 'Early-career legal opportunities in Riyadh and Saudi Arabia. A ChatGPT-powered monitor.',
          url: pageUrl()
        });
        $('share-status').textContent = '';
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    await copyText(pageUrl(), $('share-status'), 'link');
  });
}

function initializeResponsiveFilters() {
  const disclosure = $('filter-disclosure');
  if (!disclosure || typeof window.matchMedia !== 'function') return;
  const compact = window.matchMedia('(max-width: 46rem)');
  const sync = () => {
    disclosure.open = !compact.matches;
  };
  sync();
  compact.addEventListener('change', sync);
}

function boot() {
  if (!$('opportunity-list')) return;
  initializeResponsiveFilters();
  initializeSetup();
  initializeOpportunities();
  initializeShare();
}

if (typeof document !== 'undefined') boot();
