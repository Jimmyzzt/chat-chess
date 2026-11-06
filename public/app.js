import { RATINGS, MAX_MESSAGES, exampleMessages, validateMessages, parseConversation, clearAIResults, applyAnalysis, speakerOf, participants, assignSides } from './core.js';
import { FONT, badgeSVG, layoutMessages, renderSVG, exportPages } from './render.js';
import { PROVIDERS, analyzeWithProvider } from './providers.js';
import { loadCommunityPack, resetCommunityIcons } from './icons.js';
const $ = id => document.getElementById(id);
let messages = exampleMessages();
let rightSpeaker = 'B';
let editing = 0;
let adding = false;
let activeController = null;
let downloadURLs = [];
const context = document.createElement('canvas').getContext('2d');
context.font = `38px ${FONT}`;
const measure = text => context.measureText(text).width;
const status = (text, error = false) => { $('status').textContent = text; $('status').classList.toggle('error', error); };
const sourceLabel = message => ({ example: '示例预设 · 来自参考梗图', manual: '手动标记 · 非 AI 评价', ai: `AI 评价 · ${PROVIDERS[message.provider]?.label || 'OpenAI'}${Number.isFinite(message.confidence) ? ` · 置信度 ${Math.round(message.confidence * 100)}%（不代表客观正确率）` : ' · JSON 分类'}`, unrated: '尚未评价', refused: 'AI 未给出评价 · 可以手动标记' })[message.source];
const currentLayout = () => {
  const fontSize = Number($('font-size').value);
  context.font = `${fontSize}px ${FONT}`;
  return layoutMessages(messages, measure, { showIds: $('show-ids').checked, showAvatars: $('show-avatars').checked, fontSize });
};
function renderLegend() { $('legend').innerHTML = Object.entries(RATINGS).map(([value, rating]) => `<span class="legend-item" title="${rating.zh}">${badgeSVG(value)}${rating.label}</span>`).join(''); }
function updateRoles() {
  const people = participants(messages);
  $('right-role').replaceChildren(new Option('全部在左侧', ''), ...people.map(person => new Option(person, person)));
  $('right-role').value = rightSpeaker;
  $('speaker-list').replaceChildren(...people.map(person => new Option(person, person)));
}
function clearDownloads() {
  downloadURLs.forEach(url => URL.revokeObjectURL(url)); downloadURLs = [];
  $('download-results').replaceChildren(); $('download-results').hidden = true;
}
function render() {
  $('chat-preview').innerHTML = renderSVG(currentLayout(), { interactive: true });
  updateRoles();
  const manualCount = messages.filter(message => message.source === 'manual').length;
  $('message-count').textContent = `${messages.length} 条消息${manualCount ? ` · ${manualCount} 手动` : ''}`;
  $('add').disabled = messages.length >= MAX_MESSAGES;
  clearDownloads();
}
function editMessage(index, isNew = false) {
  if (activeController) { status('正在复盘，请完成或取消后再编辑。'); return; }
  editing = index; adding = isNew;
  const newSpeaker = messages.at(-1)?.side === 'right' ? (participants(messages).find(person => person !== rightSpeaker) || 'A') : (rightSpeaker || 'B');
  const message = isNew ? { text: '', speaker: newSpeaker, side: newSpeaker === rightSpeaker ? 'right' : 'left', rating: null, source: 'unrated' } : messages[index];
  $('edit-title').textContent = isNew ? '添加一条消息' : `编辑第 ${index + 1} 条消息`;
  $('message-text').value = message.text;
  $('message-speaker').value = speakerOf(message);
  document.querySelector(`input[name="side"][value="${message.side}"]`).checked = true;
  $('rating').value = message.rating || '';
  $('rating-source').textContent = sourceLabel(message);
  $('manual-rating').checked = false;
  $('delete-message').hidden = isNew;
  $('delete-message').disabled = messages.length <= 1;
  $('edit-error').textContent = '';
  $('edit-dialog').showModal();
}
$('rating').append(new Option('未标记', ''), ...Object.entries(RATINGS).map(([value, rating]) => new Option(`${rating.label} · ${rating.zh}`, value)));
renderLegend();
$('chat-preview').addEventListener('click', event => { const group = event.target.closest('[data-index]'); if (group) editMessage(Number(group.dataset.index)); });
$('chat-preview').addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-index]')) { event.preventDefault(); editMessage(Number(event.target.dataset.index)); } });
$('add').addEventListener('click', () => editMessage(messages.length, true));
$('right-role').addEventListener('change', () => { rightSpeaker = $('right-role').value; messages = assignSides(messages, rightSpeaker); render(); status('已调整右侧角色 · 发言者身份与已有评价保持不变'); });
for (const id of ['show-ids', 'show-avatars']) $(id).addEventListener('change', () => { render(); status('显示设置已更新 · 导出图片使用相同设置'); });
$('font-size').addEventListener('input', () => { $('font-size-value').value = $('font-size').value; render(); });
$('import-icons').addEventListener('click', () => $('icon-file').click());
$('icon-file').addEventListener('change', async () => {
  const file = $('icon-file').files[0]; if (!file) return;
  $('import-icons').disabled = true;
  try {
    await loadCommunityPack(file); renderLegend(); render(); $('reset-icons').hidden = false;
    $('icon-status').textContent = '已导入社区图标 · 仅当前页面使用 · 权利归原权利人，不属于本项目 MIT';
    status('社区图标已应用到预览和导出 · 未上传任何文件');
  } catch (error) { status(`图标导入失败：${error.message}`, true); }
  finally { $('import-icons').disabled = false; $('icon-file').value = ''; }
});
$('reset-icons').addEventListener('click', () => { resetCommunityIcons(); renderLegend(); render(); $('reset-icons').hidden = true; $('icon-status').textContent = '默认原创 SVG · 社区素材可本地导入，不上传、不随 MIT 授权'; status('已恢复原创 SVG 图标'); });
$('rating').addEventListener('change', () => { $('manual-rating').checked = true; $('rating-source').textContent = '保存后将标为手动修改。'; });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
$('edit-form').addEventListener('submit', event => {
  event.preventDefault();
  const previous = adding ? {} : messages[editing];
  const text = $('message-text').value.trim();
  const side = document.querySelector('input[name="side"]:checked').value;
  const speaker = $('message-speaker').value.trim();
  const rating = $('rating').value || null;
  const manuallyRated = $('manual-rating').checked || previous.source === 'manual' || rating !== (previous.rating || null);
  const changedConversation = text !== previous.text || speaker !== speakerOf(previous);
  const next = changedConversation ? clearAIResults(messages) : messages.map(message => ({ ...message }));
  const edited = { text, speaker, side, ...(previous.timestamp ? { timestamp: previous.timestamp } : {}), rating: manuallyRated ? rating : (changedConversation ? null : rating), source: manuallyRated ? (rating ? 'manual' : 'unrated') : (changedConversation ? 'unrated' : previous.source) };
  if (!changedConversation && !manuallyRated && previous.source === 'ai') { edited.provider = previous.provider; if (Number.isFinite(previous.confidence)) edited.confidence = previous.confidence; }
  if (adding) next.push(edited); else next[editing] = edited;
  try { validateMessages(next); } catch (error) { $('edit-error').textContent = error.message; return; }
  if (side === 'right') rightSpeaker = speaker;
  else if (rightSpeaker === speaker) rightSpeaker = participants(next).find(person => person !== speaker) || '';
  messages = assignSides(next, rightSpeaker); render(); $('edit-dialog').close();
  status(manuallyRated && rating ? '已保存手动标记 · 导出图片不附加来源文字' : '已保存消息 · 修改对话后，旧 AI 评价已清除');
});
$('delete-message').addEventListener('click', () => {
  if (messages.length <= 1) return;
  messages.splice(editing, 1);
  messages = clearAIResults(messages);
  if (!participants(messages).includes(rightSpeaker)) rightSpeaker = '';
  render(); $('edit-dialog').close(); status('消息已删除 · 旧 AI 评价已清除');
});
function updatePasteRoles() {
  try {
    const parsed = parseConversation($('paste-text').value);
    const people = participants(parsed);
    const previousSelection = $('paste-right-role').value;
    $('paste-right-role').replaceChildren(...people.map(person => new Option(person, person)));
    $('paste-right-role').value = people.includes(previousSelection) ? previousSelection : (people.includes(rightSpeaker) ? rightSpeaker : speakerOf(parsed.find(message => message.side === 'right') || parsed[0]));
    $('paste-right-role').disabled = false;
    $('paste-summary').textContent = `已识别 ${parsed.length} 条消息 · ${people.length} 位角色${parsed[0].timestamp ? ' · 微信格式' : ''}`;
  } catch { $('paste-right-role').disabled = true; $('paste-summary').textContent = ''; }
}
$('paste-text').addEventListener('input', updatePasteRoles);
$('paste-open').addEventListener('click', () => { $('paste-error').textContent = ''; updatePasteRoles(); $('paste-dialog').showModal(); });
$('paste-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const parsed = parseConversation($('paste-text').value, $('paste-right-role').disabled ? {} : { rightSpeaker: $('paste-right-role').value });
    messages = parsed; rightSpeaker = speakerOf(parsed.find(message => message.side === 'right') || parsed[0]);
    if (parsed.some(message => message.timestamp)) { $('show-ids').checked = true; $('show-avatars').checked = true; }
    render(); $('paste-dialog').close(); $('paste-text').value = ''; status(`已导入 ${messages.length} 条消息 · ${participants(messages).length} 位角色 · 可在上方调整右侧角色与显示设置`);
  }
  catch (error) { $('paste-error').textContent = error.message; }
});
$('reset').addEventListener('click', () => { messages = exampleMessages(); rightSpeaker = 'B'; $('show-ids').checked = false; $('show-avatars').checked = false; $('font-size').value = '38'; $('font-size-value').value = '38'; render(); status('已还原原图示例 · 这些标记是示例预设'); });
$('provider').addEventListener('change', () => {
  $('clear-key').click(); const provider = PROVIDERS[$('provider').value];
  $('key-label').textContent = `${provider.label} API Key`;
  $('consent-text').textContent = `我了解浏览器使用 Key 的风险，同意将聊天发送给 ${provider.label}。`;
  status(`已切换至 ${provider.label} · Key 和发送确认已清空`);
});
$('toggle-key').addEventListener('click', () => { const showing = $('api-key').type === 'password'; $('api-key').type = showing ? 'text' : 'password'; $('toggle-key').textContent = showing ? '隐藏' : '显示'; $('toggle-key').setAttribute('aria-pressed', String(showing)); });
$('clear-key').addEventListener('click', () => { $('api-key').value = ''; $('api-key').type = 'password'; $('toggle-key').textContent = '显示'; $('toggle-key').setAttribute('aria-pressed', 'false'); $('consent').checked = false; status('已清除页面中的 API Key'); });
$('cancel-analysis').addEventListener('click', () => activeController?.abort());
$('analyze').addEventListener('click', async () => {
  if (activeController) return;
  if (!$('api-key').value.trim() || !$('consent').checked) { $('ai-settings').open = true; $('api-key').focus(); status('填写你自己的 Key 并确认发送后，再点击 AI 复盘。'); return; }
  const controller = new AbortController(); activeController = controller;
  const provider = $('provider').value;
  const locked = ['add', 'paste-open', 'reset', 'analyze', 'right-role', 'provider'];
  locked.forEach(id => { $(id).disabled = true; });
  $('cancel-analysis').hidden = false; $('ai-settings').open = true;
  $('analyze').textContent = '复盘中…'; status(`正在一次性复盘 ${messages.length} 条消息 · 等待 ${PROVIDERS[provider].label} 返回（最多 45 秒）`);
  try {
    const results = await analyzeWithProvider(messages, $('api-key').value.trim(), provider, { signal: controller.signal });
    const preserved = messages.filter(message => message.source === 'manual').length;
    messages = applyAnalysis(messages, results);
    render();
    const refused = results.filter(result => result.source === 'refused').length;
    status(`复盘完成 · ${preserved ? `保留 ${preserved} 条手动标记 · ` : ''}${refused ? `${refused} 条未获 AI 评价，可手动标记` : '点击任意气泡查看来源或修改标记'}`);
  } catch (error) { status(error.message, true); }
  finally { activeController = null; locked.forEach(id => { $(id).disabled = false; }); $('add').disabled = messages.length >= MAX_MESSAGES; $('cancel-analysis').hidden = true; $('analyze').textContent = '✧ AI 复盘'; }
});
async function svgToPNG(svg, height) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('浏览器无法渲染导出图片，请换用新版浏览器。')); image.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = 1440; canvas.height = Math.ceil(height * 2);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('浏览器无法创建导出画布。');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    canvas.width = 0; canvas.height = 0;
    if (!blob) throw new Error('图片过大，浏览器无法完成导出。请减少消息后重试。');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
$('export').addEventListener('click', async () => {
  $('export').disabled = true; status('正在浏览器本地生成高清图片…'); clearDownloads();
  try {
    await document.fonts.ready;
    const layout = currentLayout();
    const pages = exportPages(layout);
    for (const [index, page] of pages.entries()) {
      const blob = await svgToPNG(renderSVG(layout, page), page.height);
      const url = URL.createObjectURL(blob); downloadURLs.push(url);
      const link = document.createElement('a'); link.href = url; link.download = `chat-chess${pages.length > 1 ? `-${index + 1}` : ''}.png`; link.textContent = pages.length > 1 ? `下载第 ${index + 1}/${pages.length} 张` : '再次下载图片'; $('download-results').append(link);
    }
    $('download-results').hidden = false;
    if (pages.length === 1) $('download-results').firstElementChild.click();
    status(pages.length === 1 ? 'PNG 已生成 · 1440px 宽 · 已应用 ID 与头像显示设置' : `长对话已分成 ${pages.length} 张高清 PNG，点击上方链接分别下载。`);
  } catch (error) { status(error.message, true); }
  finally { $('export').disabled = false; }
});
window.addEventListener('pagehide', () => { activeController?.abort(); $('api-key').value = ''; $('consent').checked = false; clearDownloads(); });
render();
