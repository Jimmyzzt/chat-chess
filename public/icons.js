// Only importer code is MIT-licensed. User-supplied Chess.com artwork is not.
// See THIRD_PARTY_NOTICES.md. Imported artwork stays in page memory.
const FILES = { book: 'book', brilliant: 'brilliant', great: 'excellent', best: 'best', good: 'good', inaccuracy: 'inaccuracy', mistake: 'mistake', blunder: 'blunder' };
let communityIcons = null;
export const communityIcon = rating => communityIcons?.[rating] || null;
export function resetCommunityIcons() { communityIcons = null; }

function cleanSVG(source) {
  const document = new DOMParser().parseFromString(source.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, ''), 'image/svg+xml');
  const root = document.documentElement;
  if (document.querySelector('parsererror') || root.localName !== 'svg' || root.getAttribute('viewBox') !== '0 0 18 19') throw new Error('图标 SVG 格式不符合 brilliance_v2 包。');
  const attributes = new Set(['xmlns', 'class', 'id', 'width', 'height', 'viewBox', 'd', 'fill', 'opacity', 'isolation', 'transform']);
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!['svg', 'g', 'path'].includes(element.localName)) throw new Error('图标含有不支持的 SVG 元素。');
    for (const attribute of [...element.attributes]) {
      if (!attributes.has(attribute.name) || /url\s*\(|javascript:|data:|https?:/i.test(attribute.value) && attribute.name !== 'xmlns') throw new Error('图标包含不支持的外部引用或属性。');
      if (['id', 'class'].includes(attribute.name)) element.removeAttribute(attribute.name);
    }
  }
  root.setAttribute('x', '-30'); root.setAttribute('y', '-30'); root.setAttribute('width', '60'); root.setAttribute('height', '63.333');
  return new XMLSerializer().serializeToString(root);
}
export async function loadCommunityPack(file) {
  if (file.size > 8 * 1024 * 1024) throw new Error('请导入不超过 8MB 的 brilliance_v2.zip。');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < Math.max(0, bytes.length - 65557)) throw new Error('无法识别 ZIP 目录。');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const sources = new Map();
  const decoder = new TextDecoder();
  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('ZIP 目录损坏。');
    const method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const length = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (Object.values(FILES).some(value => name === `svg/${value}.svg`)) {
      if (sources.has(name) || length > 20000 || compressed > 20000 || localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50 || view.getUint16(offset + 8, true) & 1) throw new Error('ZIP 图标条目无效。');
      const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
      if (start + compressed > bytes.length) throw new Error('ZIP 图标数据不完整。');
      let raw = bytes.subarray(start, start + compressed);
      if (method === 8) {
        if (typeof DecompressionStream !== 'function') throw new Error('浏览器不支持本地 ZIP 解压，请使用新版 Chrome 或 Edge。');
        const reader = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        const chunks = []; let total = 0;
        while (true) { const { done, value } = await reader.read(); if (done) break; total += value.length; if (total > 20000) { await reader.cancel(); throw new Error('解压后的图标过大。'); } chunks.push(value); }
        raw = new Uint8Array(total); let position = 0; for (const chunk of chunks) { raw.set(chunk, position); position += chunk.length; }
      } else if (method !== 0) throw new Error('不支持此 ZIP 压缩方式。');
      if (raw.length !== length) throw new Error('ZIP 图标长度不一致。');
      sources.set(name, cleanSVG(decoder.decode(raw)));
    }
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  const result = {};
  for (const [rating, name] of Object.entries(FILES)) {
    const svg = sources.get(`svg/${name}.svg`);
    if (!svg) throw new Error(`压缩包缺少 svg/${name}.svg。`);
    result[rating] = svg;
  }
  communityIcons = result;
}
