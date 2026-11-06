const entities = {amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' '};
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, entity) => {
  if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? all;
  const point = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
  return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : all;
});
const normalized = value => decode(value).replace(/\s+/g, ' ').trim();

// Small, non-executing structural reader for the two explicitly supported HTML layouts.
// Script/template content and hidden ancestors never count as availability evidence.
export function readHtml(html) {
  const root = {tag:'root', attrs:{}, children:[], parent:null, hidden:false};
  const stack = [root];
  const voids = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const rawTags = new Set(['script','style','textarea','title','xmp','iframe','noembed','noframes','plaintext']);
  // Quoted attributes are one token even when they contain markup characters.
  // Raw-text contents never become nodes; keep iframe attrs for the ATS reader.
  const tokenizer = /<!--[\s\S]*?-->|<![^>]*>|<(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/g;
  let match;
  while ((match = tokenizer.exec(html))) {
    const token = match[0];
    if (/^<!/.test(token)) continue;
    if (/^<\//.test(token)) {
      const tag = token.match(/^<\/\s*([\w:-]+)/)?.[1]?.toLowerCase();
      const index = stack.findLastIndex(node => node.tag === tag);
      // A closing ancestor outside a hidden template is not visible evidence.
      if (index > 0 && !stack.slice(index + 1).some(node => node.tag === 'template')) stack.length = index;
    } else if (/^</.test(token)) {
      const tag = token.match(/^<\s*([\w:-]+)/)?.[1]?.toLowerCase();
      if (!tag) continue;
      const attrs = {};
      const body = token.replace(/^<\s*[\w:-]+/, '').replace(/\/?\s*>$/, '');
      for (const match of body.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
      const parent = stack.at(-1);
      const node = {tag, attrs, children:[], parent, hidden:parent.hidden || ['script','style','template','head'].includes(tag) || 'hidden' in attrs || attrs['aria-hidden'] === 'true' || (attrs.class || '').split(/\s+/).includes('d-none') || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(attrs.style || '')};
      parent.children.push(node);
      if (rawTags.has(tag)) {
        // Do not tokenize JS/CSS as HTML: unmatched quotes or '<' inside code
        // must not consume the actual closing tag and the following page.
        const closing = new RegExp(`<\\/\\s*${tag}\\s*>`, 'gi');
        closing.lastIndex = tokenizer.lastIndex;
        const end = tag !== 'plaintext' && closing.exec(html);
        tokenizer.lastIndex = end ? closing.lastIndex : html.length;
      }
      else if (!voids.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
    } else stack.at(-1).children.push(token);
  }
  return root;
}
const elements = node => node.children.filter(child => typeof child !== 'string');
export const textOf = node => node.hidden ? '' : normalized(node.children.map(child => typeof child === 'string' ? child : textOf(child)).join(' '));
export function find(node, predicate) {
  if (node.hidden) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node).flatMap(child => find(child, predicate))];
}
