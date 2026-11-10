// Pass this self-contained function to Playwright page.evaluate in a fresh,
// unauthenticated context. It reads DOM state only: no clicks, form fills or I/O.
// The runner binds its returned HTML to navigation URL/time/hash in the proof.
export function projectVisibleHtml() {
  const omitted = new Set(['script','style','template','head','noscript','iframe','object','embed','svg','canvas']);
  const voids = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const allowed = new Set(['id','class','name','type','role','method','href','action','for','alt','aria-label','aria-labelledby','aria-disabled','data-job-id','data-org-id']);
  const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  let nodes = 0, characters = 0;
  const bounded = value => { characters += value.length; if (characters > 500000) throw new Error('Visible DOM proof exceeds size limit'); return value; };
  function visit(node, optionContext = false) {
    if (++nodes > 20000) throw new Error('Visible DOM proof exceeds node limit');
    if (node.nodeType === 3) return bounded(escape(node.textContent ?? ''));
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    if (omitted.has(tag) || node.hidden || node.inert || node.getAttribute('aria-hidden')?.toLowerCase() === 'true' || (tag === 'input' && node.type.toLowerCase() === 'hidden')) return '';
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0 || style.contentVisibility === 'hidden') return '';
    // A display:contents wrapper has no box but can contain visible controls.
    // Closed select options also have no box; preserve only live selected options.
    if (tag === 'option') {
      if (!optionContext || !node.selected || node.disabled) return '';
    } else if (!['body','optgroup'].includes(tag) && style.display !== 'contents' && ![...node.getClientRects()].some(rect => rect.width > 0 && rect.height > 0)) return '';
    const attributes = [];
    for (const name of allowed) if (node.hasAttribute(name)) attributes.push(`${name}="${escape(node.getAttribute(name))}"`);
    for (const name of ['disabled','readonly','multiple','required']) if (node.hasAttribute(name) || node[name] === true) attributes.push(name);
    if (tag === 'option') attributes.push('selected', `value="${escape(node.value)}"`);
    // Preserve live enabled state even when inherited from a disabled fieldset.
    if (['input','select','textarea','button','option'].includes(tag) && node.matches(':disabled') && !attributes.includes('disabled')) attributes.push('disabled');
    const open = bounded(`<${tag}${attributes.length ? ' '+attributes.join(' ') : ''}>`);
    if (voids.has(tag)) return open;
    // Never serialize user-entered values, textarea contents or hidden tokens.
    const children = tag === 'textarea' ? '' : [...node.childNodes].map(child => visit(child, tag === 'select' || tag === 'optgroup' && optionContext)).join('');
    return open + children + bounded(`</${tag}>`);
  }
  if (!document.body) throw new Error('Visible document body unavailable');
  return visit(document.body);
}
