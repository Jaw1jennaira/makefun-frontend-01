// A small, safe Markdown renderer for bounty descriptions and rules.
// The input is escaped first, so no HTML from the API can run; only the
// Markdown this file generates becomes markup. Links stay links.

import { esc } from './format.js';

function inline(text) {
  let out = esc(text);
  // `code`
  out = out.replace(/`([^`\n]+)`/g, (_, code) => `<code>${code}</code>`);
  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // *italic*
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // [text](https://...)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, href) => `<a href="${href}" rel="noopener">${label}</a>`,
  );
  // bare https://... URLs
  out = out.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    '$1<a href="$2" rel="noopener">$2</a>',
  );
  return out;
}

/** Markdown text -> HTML. Headings, lists, code blocks, quotes, rules, paragraphs. */
export function markdown(source) {
  const lines = String(source ?? '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  let inCode = false;
  let codeBuf = [];

  const flushList = (items, ordered) => {
    if (!items.length) return;
    const tag = ordered ? 'ol' : 'ul';
    html.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      i += 1;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 3);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      html.push('<hr>');
      i += 1;
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      const parts = [quote[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^>\s?(.*)$/);
        if (!next) break;
        parts.push(next[1]);
        i += 1;
      }
      html.push(`<blockquote>${parts.map((p) => `<p>${inline(p)}</p>`).join('')}</blockquote>`);
      i += 1;
      continue;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (ordered || bullet) {
      const items = [];
      const isOrdered = Boolean(ordered);
      const re = isOrdered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;
      while (i < lines.length) {
        const m = lines[i].match(re);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      flushList(items, isOrdered);
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const para = [line];
    while (i + 1 < lines.length && lines[i + 1].trim()) {
      const next = lines[i + 1];
      if (/^(#{1,3}\s|```|\s*[-*]\s|\s*\d+[.)]\s|>\s?)/.test(next)) break;
      para.push(next);
      i += 1;
    }
    html.push(`<p>${inline(para.join(' '))}</p>`);
    i += 1;
  }
  if (inCode) html.push(`<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`);
  return html.join('\n');
}
