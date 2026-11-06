import { RATINGS, speakerOf } from './core.js';
import { communityIcon } from './icons.js';
export const WIDTH = 720;
export const FONT = 'Arial, "Microsoft YaHei", sans-serif';
export const escapeXML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
export function iconMarkup(rating) {
  const white = '#fff';
  if (rating === 'book') return '<path d="M-22-17Q-11-21-2-15V20Q-12 14-22 16ZM22-17Q11-21 2-15V20Q12 14 22 16Z" fill="#fff"/><path d="M0-16V20" stroke="#dfd3bf" stroke-width="2"/>';
  if (rating === 'best') return '<path d="m0-23 6 16 17 1-13 11 4 17L0 12-14 22l4-17-13-11 17-1Z" fill="#fff"/>';
  if (rating === 'good') return '<path d="m-17 0 11 11L18-14" fill="none" stroke="#f3f6ed" stroke-width="10" stroke-linejoin="miter"/>';
  if (rating === 'great') return '<path d="M-20-4h9v24h-9ZM-6-5 2-17q8-6 7 4L6-4h12q6 0 4 7l-4 13q-1 4-6 4H-6Z" fill="#fff"/>';
  const symbol = ({ brilliant: '!!', inaccuracy: '?!', mistake: '?', blunder: '??' })[rating] || '·';
  return `<text y="17" text-anchor="middle" fill="${white}" font-family="Arial,sans-serif" font-weight="800" font-size="${symbol.length === 2 ? 46 : 48}" letter-spacing="-3">${symbol}</text>`;
}
export function badgeSVG(rating) {
  if (communityIcon(rating)) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 66" aria-hidden="true">${communityIcon(rating)}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 64" aria-hidden="true"><circle r="31" fill="${RATINGS[rating].color}"/>${iconMarkup(rating)}</svg>`;
}
export function wrapText(text, measure, maxWidth = 616) {
  const lines = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    const parts = paragraph.match(/\s+|[A-Za-z0-9'’.,!?;:\-]+|[^\s]/gu) || [''];
    for (const part of parts) {
      if (measure(line + part) <= maxWidth) { line += part; continue; }
      if (line.trim()) { lines.push(line.trimEnd()); line = ''; }
      let remainder = part.trimStart();
      for (const char of Array.from(remainder)) {
        if (line && measure(line + char) > maxWidth) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
const AVATAR_COLORS = ['#d4dfd3', '#ded4e3', '#d3dfe6', '#e6d7cb', '#dedecb', '#cadfdc', '#e4d1d7', '#d8d7e6'];
export function avatarFor(speaker) {
  let hash = 0;
  for (const character of speaker) hash = (Math.imul(hash, 31) + character.codePointAt(0)) >>> 0;
  const characters = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(speaker)].map(part => part.segment) : Array.from(speaker);
  return { text: characters.slice(0, 2).join(''), color: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}
export function layoutMessages(messages, measure, { showIds = false, showAvatars = false, fontSize = 38 } = {}) {
  fontSize = Number.isFinite(Number(fontSize)) ? Math.min(48, Math.max(24, Number(fontSize))) : 38;
  const lineHeight = Math.round(fontSize * 1.26);
  let y = 48;
  const inset = showAvatars ? 96 : 20;
  const maxBubbleWidth = WIDTH - inset - 20;
  const items = messages.map((message, index) => {
    const lines = wrapText(message.text, measure, maxBubbleWidth - 48);
    const width = Math.min(maxBubbleWidth, Math.max(72, ...lines.map(measure)) + 48);
    const height = Math.max(showAvatars ? 80 : 60, lines.length * lineHeight + 36);
    const x = message.side === 'right' ? WIDTH - inset - width : inset;
    if (showIds) y += 30;
    const speaker = speakerOf(message);
    const characters = Array.from(speaker);
    let displayName = speaker;
    while (characters.length > 1 && measure(displayName) * 20 / fontSize > Math.max(40, width - 72)) { characters.pop(); displayName = characters.join('') + '…'; }
    const item = { ...message, speaker, displayName, index, x, y, top: y - 34, width, height, lines };
    y += height + (messages[index + 1] && speakerOf(messages[index + 1]) === speakerOf(message) ? 12 : 32);
    return item;
  });
  return { items, width: WIDTH, height: Math.max(180, y - 12), showIds, showAvatars, fontSize, lineHeight };
}
export function renderSVG(layout, { interactive = false, top = 0, height = layout.height } = {}) {
  const groups = layout.items.filter(item => item.y + item.height >= top && item.top <= top + height).map(item => {
    const { x, y, width, height: bubbleHeight, lines, side, rating, index } = item;
    const fill = side === 'left' ? '#efefef' : 'url(#chat-gradient)';
    const textColor = side === 'left' ? '#171717' : '#fff';
    const badgeX = side === 'left' ? x + width - 5 : x + 2;
    const badge = rating && Object.hasOwn(RATINGS, rating) ? `<g transform="translate(${badgeX} ${y + 1})">${communityIcon(rating) || `<circle r="30" fill="${RATINGS[rating].color}"/>${iconMarkup(rating)}`}</g>` : '';
    const avatar = avatarFor(item.speaker);
    const avatarX = side === 'left' ? 20 : WIDTH - 80;
    const avatarMarkup = layout.showAvatars ? `<g transform="translate(${avatarX} ${y + 10})"><rect width="60" height="60" rx="18" fill="${avatar.color}"/><text x="30" y="31" dominant-baseline="central" text-anchor="middle" font-family='${FONT}' font-weight="600" font-size="${[...avatar.text].length === 1 ? 35 : 27}" fill="#55515b">${escapeXML(avatar.text)}</text></g>` : '';
    const nameMarkup = layout.showIds ? `<text x="${side === 'left' ? x + 12 : x + width - 12}" y="${y - 8}" text-anchor="${side === 'left' ? 'start' : 'end'}" font-family='${FONT}' font-size="20" fill="#8b8592">${escapeXML(item.displayName)}</text>` : '';
    const attributes = interactive ? `data-index="${index}" role="button" tabindex="0" aria-label="${escapeXML(`编辑第 ${index + 1} 条消息，${item.speaker}：${item.text}；${rating ? RATINGS[rating].label : '未标记'}`)}"` : '';
    return `<g ${attributes}>${nameMarkup}${avatarMarkup}<rect x="${x}" y="${y}" width="${width}" height="${bubbleHeight}" rx="${Math.min(42, bubbleHeight / 2)}" fill="${fill}"/><text fill="${textColor}" font-family='${FONT}' font-size="${layout.fontSize}">${lines.map((line, i) => `<tspan x="${x + 24}" y="${y + 18 + layout.fontSize * .98 + i * layout.lineHeight}">${escapeXML(line)}</tspan>`).join('')}</text>${badge}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} ${WIDTH} ${height}" width="${WIDTH}" height="${height}" ${interactive ? 'role="group" aria-label="聊天梗图，可点击各条消息编辑"' : ''}><defs><linearGradient id="chat-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${layout.height}"><stop stop-color="#6442cf"/><stop offset="1" stop-color="#2f8de5"/></linearGradient></defs><rect y="${top}" width="720" height="${height}" fill="white"/>${groups}</svg>`;
}
// Keep every canvas below 16 million pixels / 8192 pixels per side, splitting
// at message boundaries where possible. A single huge bubble may span pages.
export function exportPages(layout, maxHeight = 4000) {
  const pages = [];
  let top = 0;
  while (top < layout.height) {
    let bottom = Math.min(layout.height, top + maxHeight);
    if (bottom < layout.height) {
      const boundary = layout.items.find(item => item.top - 2 > top && item.y + item.height > bottom);
      if (boundary && boundary.top - 2 < bottom) bottom = boundary.top - 2;
    }
    pages.push({ top, height: bottom - top });
    top = bottom;
  }
  return pages;
}
