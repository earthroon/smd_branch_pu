// Dependency-free structural reader for the CF02 frozen Vue templates.
// This is NOT a Vue compiler and cannot establish runtime/rendering parity.
import { readFileSync } from 'node:fs';

const VOID_ELEMENTS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

export function parseAttributes(raw) {
  const attrs = {};
  let i = 0;
  while (i < raw.length) {
    while (/\s/.test(raw[i] ?? '')) i += 1;
    if (i >= raw.length) break;
    if (raw[i] === '/') { i += 1; continue; }
    const begin = i;
    while (i < raw.length && !/[\s=/]/.test(raw[i])) i += 1;
    if (i === begin) throw new Error(`CF02_TEMPLATE_ATTRIBUTE_INVALID at ${i}: ${raw.slice(i)}`);
    const key = raw.slice(begin, i);
    while (/\s/.test(raw[i] ?? '')) i += 1;
    let value = true;
    if (raw[i] === '=') {
      i += 1;
      while (/\s/.test(raw[i] ?? '')) i += 1;
      const q = raw[i];
      if (q === '"' || q === "'") {
        i += 1;
        const startValue = i;
        while (i < raw.length && raw[i] !== q) i += 1;
        if (i >= raw.length) throw new Error(`CF02_TEMPLATE_QUOTE_UNCLOSED: ${key}`);
        value = raw.slice(startValue, i);
        i += 1;
      } else {
        const startValue = i;
        while (i < raw.length && !/\s/.test(raw[i])) i += 1;
        value = raw.slice(startValue, i);
      }
    }
    if (Object.hasOwn(attrs, key)) throw new Error(`CF02_TEMPLATE_DUPLICATE_ATTRIBUTE: ${key}`);
    attrs[key] = value;
  }
  return attrs;
}

export function parseTemplate(source) {
  const begin = source.indexOf('<template>');
  const end = source.lastIndexOf('</template>');
  if (begin === -1 || end <= begin) throw new Error('CF02_TEMPLATE_MISSING_ROOT');
  const html = source.slice(begin + '<template>'.length, end);
  const root = { tag: '#root', attrs: {}, parent: null, children: [] };
  const stack = [root];
  const appendText = (txt) => {
    if (txt.length) stack.at(-1).children.push({ tag: '#text', value: txt, parent: stack.at(-1), children: [] });
  };
  let index = 0;
  while (index < html.length) {
    const next = html.indexOf('<', index);
    if (next === -1) { appendText(html.slice(index)); break; }
    appendText(html.slice(index, next));
    if (html.startsWith('<!--', next)) {
      const stop = html.indexOf('-->', next + 4);
      if (stop < 0) throw new Error('CF02_TEMPLATE_COMMENT_UNCLOSED');
      index = stop + 3;
      continue;
    }
    let limit = next + 1;
    let quote = null;
    while (limit < html.length) {
      const ch = html[limit];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '>') break;
      limit += 1;
    }
    if (limit >= html.length) throw new Error('CF02_TEMPLATE_TAG_UNCLOSED');
    const token = html.slice(next + 1, limit).trim();
    index = limit + 1;
    if (token.startsWith('/')) {
      const name = token.slice(1).trim();
      if (stack.length === 1 || stack.at(-1).tag !== name) {
        throw new Error(`CF02_TEMPLATE_NESTING_INVALID: expected closing ${stack.at(-1).tag}, got ${name}`);
      }
      stack.pop();
      continue;
    }
    const match = /^([A-Za-z][\w-]*)(?:\s+|(?=\/)|$)([\s\S]*)$/.exec(token);
    if (!match) throw new Error(`CF02_TEMPLATE_ELEMENT_INVALID: ${token.slice(0, 40)}`);
    const tag = match[1];
    const selfClose = /\/\s*$/.test(token) || VOID_ELEMENTS.has(tag.toLowerCase());
    const node = { tag, attrs: parseAttributes(match[2]), parent: stack.at(-1), children: [] };
    stack.at(-1).children.push(node);
    if (!selfClose) stack.push(node);
  }
  if (stack.length !== 1) throw new Error(`CF02_TEMPLATE_UNCLOSED: ${stack.slice(1).map(n => n.tag)}`);
  return root;
}

export function loadSfc(path) {
  const source = readFileSync(path, 'utf8');
  const tree = parseTemplate(source);
  const script = source.slice(0, source.indexOf('<template>'));
  return { source, tree, script };
}

export function findElements(node, predicate) {
  const collected = [];
  const visit = (n) => {
    if (predicate(n)) collected.push(n);
    for (const child of n.children) visit(child);
  };
  visit(node);
  return collected;
}
export const tags = (tree, tag) => findElements(tree, (n) => n.tag === tag);
export const attr = (node, key) => node.attrs[key];
export const hasClass = (node, name) => String(attr(node, 'class') ?? '').split(/\s+/).includes(name);
export const directElements = (node) => node.children.filter((child) => child.tag !== '#text');
export const getText = (node) => {
  if (node.tag === '#text') return node.value;
  return node.children.map(getText).join('');
};
