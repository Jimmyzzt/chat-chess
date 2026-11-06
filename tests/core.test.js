import test from 'node:test';
import assert from 'node:assert/strict';
import { RATINGS, ENDPOINT, exampleMessages, validateMessages, parseConversation, buildDecisionRequest, mapAnswers, analyzeMessages, clearAIResults, applyAnalysis, assignSides, participants } from '../public/core.js';
import { escapeXML, wrapText, layoutMessages, renderSVG, exportPages, avatarFor } from '../public/render.js';
const chat = [{ side: 'left', text: '你好' }, { side: 'right', text: 'Hello!' }];
const answer = (index, choice = 'good') => ({ name: `move_${index}`, type: 'choice', choice, confidence: .82 });
const key = 'sk-test-placeholder-not-real';
test('example matches the original six lines and ratings', () => {
  const messages = exampleMessages();
  assert.equal(messages.length, 6);
  assert.deepEqual(messages.map(message => message.rating), ['book', 'book', 'good', 'best', 'great', 'brilliant']);
  messages[0].text = 'changed';
  assert.notEqual(exampleMessages()[0].text, 'changed');
});
test('input bounds, empty messages and sides', () => {
  assert.equal(validateMessages(chat), chat);
  for (const invalid of [null, [], Array(31).fill(chat[0]), [{ side: 'middle', text: 'a' }], [{ side: 'left', text: ' ' }], [{ side: 'left', text: 42 }], [{ side: 'left', text: 'x'.repeat(20001) }]]) assert.throws(() => validateMessages(invalid));
  assert.doesNotThrow(() => validateMessages([{ side: 'left', text: 'x'.repeat(20000) }]));
});
test('paste handles fullwidth colon, CRLF, mixed case and continuation lines', () => {
  const parsed = parseConversation('\r\nA：你好\r\n第二行\r\nb: Hello!\r\n');
  assert.deepEqual(parsed.map(({ side, text }) => ({ side, text })), [{ side: 'left', text: '你好\n第二行' }, { side: 'right', text: 'Hello!' }]);
  for (const invalid of ['missing prefix', 'A: \nB: ok', 'A: ' + 'x'.repeat(20001)]) assert.throws(() => parseConversation(invalid));
});
const wechat = `小林
2026年11月06日 20:45
今天去哪？
第二行内容

0verthink
2026年11月06日 20:45
去图书馆。

小林
2026年11月06日 20:45
好呀。

小周
2026年11月06日 20:46
带上我！`;
test('WeChat import retains names, time, order and multiline content', () => {
  const messages = parseConversation(wechat.replace(/\n/g, '\r\n'), { rightSpeaker: '0verthink' });
  assert.equal(messages.length, 4);
  assert.deepEqual(participants(messages), ['小林', '0verthink', '小周']);
  assert.deepEqual(messages.map(message => message.side), ['left', 'right', 'left', 'left']);
  assert.equal(messages[0].text, '今天去哪？\n第二行内容');
  assert.equal(messages[3].timestamp, '2026年11月06日 20:46');
  assert.throws(() => parseConversation(wechat, { rightSpeaker: '不存在' }));
  assert.throws(() => parseConversation('小林\n2026年11月06日 20:45\n\n小周\n2026年11月06日 20:46\nhello'));
});
test('group identities survive side selection and AI evaluation lifecycle', () => {
  const messages = parseConversation(wechat, { rightSpeaker: '0verthink' });
  const switched = assignSides(messages, '小周');
  assert.deepEqual(switched.map(message => message.side), ['left', 'left', 'left', 'right']);
  assert.equal(buildDecisionRequest(messages).input, buildDecisionRequest(switched).input);
  const payload = JSON.parse(buildDecisionRequest(switched).input);
  assert.equal(payload[0].speaker, '小林'); assert.equal(payload[1].speaker, '0verthink');
  const evaluated = applyAnalysis(switched, switched.map(() => ({ rating: 'good', confidence: .8, source: 'ai' })));
  assert.equal(evaluated[0].speaker, '小林'); assert.equal(evaluated[0].timestamp, messages[0].timestamp);
  const invalidated = clearAIResults(evaluated);
  assert.equal(invalidated[0].speaker, '小林'); assert.equal(invalidated[0].timestamp, messages[0].timestamp);
  assert.equal(invalidated[0].confidence, undefined);
});
test('named colon-format group conversations and ISO dates work', () => {
  const messages = parseConversation('小林: hi\n小周：hello\nRobin: hey', { rightSpeaker: 'Robin' });
  assert.equal(participants(messages).length, 3);
  assert.equal(messages[2].side, 'right');
  assert.equal(parseConversation('Robin\n2026-11-06 20:45:12\nHello')[0].speaker, 'Robin');
  assert.throws(() => validateMessages([{ side: 'left', speaker: 'x'.repeat(81), text: 'hello' }]));
});
test('ID/avatar display settings affect both preview and export without remote assets', () => {
  const messages = parseConversation(wechat);
  const hidden = renderSVG(layoutMessages(messages, text => text.length * 38));
  const shownLayout = layoutMessages(messages, text => text.length * 38, { showIds: true, showAvatars: true });
  const shown = renderSVG(shownLayout);
  assert.ok(!hidden.includes('小林'));
  assert.ok(shown.includes('小林')); assert.ok(shown.includes('0v'));
  assert.ok(!shown.includes('<image')); assert.ok(!shown.includes('foreignObject'));
  assert.ok(shownLayout.items.every(item => item.x >= 20 && item.x + item.width <= 700));
  assert.ok(shownLayout.height > layoutMessages(messages, text => text.length * 38).height);
  assert.deepEqual(avatarFor('0verthink'), avatarFor('0verthink'));
  assert.equal(avatarFor('0verthink').text, '0v');
  assert.equal(avatarFor('👩‍💻小林').text, '👩‍💻小');
  const hostile = renderSVG(layoutMessages([{ side: 'left', speaker: '<img onerror=x>', text: 'hi' }], text => text.length * 20, { showIds: true, showAvatars: true }));
  assert.ok(!hostile.includes('<img')); assert.ok(hostile.includes('&lt;img'));
});
test('one payload contains shared conversation and named choice questions', () => {
  const body = buildDecisionRequest(chat);
  assert.equal(body.model, 'gpt-6-luna');
  assert.deepEqual(JSON.parse(body.input), [{ index: 0, speaker: 'A', text: '你好' }, { index: 1, speaker: 'B', text: 'Hello!' }]);
  assert.deepEqual(body.questions.map(q => q.name), ['move_0', 'move_1']);
  for (const question of body.questions) {
    assert.equal(question.type, 'choice');
    assert.deepEqual(question.choices.map(choice => choice.value), Object.keys(RATINGS));
    assert.ok(question.choices.every(choice => choice.description));
  }
  assert.ok(!JSON.stringify(body).includes(key));
});
test('map by unique name rather than response order; keep refusals distinct', () => {
  assert.deepEqual(mapAnswers({ answers: [answer(1, 'best'), answer(0)] }, 2).map(result => result.rating), ['good', 'best']);
  assert.deepEqual(mapAnswers({ answers: [{ name: 'move_0', type: 'refusal' }] }, 1), [{ rating: null, source: 'refused' }]);
});
test('AI reruns preserve manual choices; conversation edits invalidate AI provenance', () => {
  const messages = [{ side: 'left', text: 'A', rating: 'brilliant', source: 'manual' }, { side: 'right', text: 'B', rating: 'best', source: 'ai', confidence: .7 }];
  const rerun = applyAnalysis(messages, [{ rating: 'book', source: 'ai', confidence: .5 }, { rating: 'good', source: 'ai', confidence: .6 }]);
  assert.equal(rerun[0].rating, 'brilliant'); assert.equal(rerun[0].source, 'manual');
  assert.equal(rerun[1].rating, 'good');
  const cleared = clearAIResults(rerun);
  assert.equal(cleared[0].rating, 'brilliant'); assert.equal(cleared[0].source, 'manual');
  assert.equal(cleared[1].rating, null); assert.equal(cleared[1].source, 'unrated'); assert.equal(cleared[1].confidence, undefined);
  assert.equal(messages[1].confidence, .7);
});
test('reject partial, duplicate, unknown and invalid model output atomically', () => {
  for (const answers of [[], [answer(0), answer(0)], [answer(0), answer(9)], [answer(0), answer(1, 'injected')], [answer(0), { ...answer(1), confidence: 2 }], [answer(0), { ...answer(1), confidence: NaN }], [answer(0), null]]) assert.throws(() => mapAnswers({ answers }, 2));
  assert.throws(() => mapAnswers({}, 1));
});
test('analysis performs exactly one fixed-endpoint POST with no persistence or cookies', async () => {
  let calls = 0;
  const result = await analyzeMessages(chat, key, { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, ENDPOINT);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, `Bearer ${key}`);
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.equal(JSON.parse(options.body).questions.length, 2);
    return Response.json({ answers: [answer(0), answer(1)] });
  } });
  assert.equal(result.length, 2); assert.equal(calls, 1);
});
test('bad input/key never sends a request', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; };
  await assert.rejects(analyzeMessages([], key, { fetchImpl }));
  for (const invalid of ['', 'sk-a\nheader', 'not-a-key']) await assert.rejects(analyzeMessages(chat, invalid, { fetchImpl }));
  assert.equal(calls, 0);
});
test('HTTP failures give safe errors without reading or revealing upstream details and do not retry', async () => {
  for (const status of [400, 401, 403, 429, 500, 503]) {
    let calls = 0;
    await assert.rejects(analyzeMessages(chat, key, { fetchImpl: async () => {
      calls++; return { ok: false, status, json: () => { throw new Error('sensitive body must not be read'); } };
    } }), error => !error.message.includes('sensitive') && !error.message.includes(key));
    assert.equal(calls, 1);
  }
});
test('network, invalid JSON and malformed responses are handled', async () => {
  await assert.rejects(analyzeMessages(chat, key, { fetchImpl: async () => { throw new TypeError('secret upstream text'); } }), /跨域/);
  await assert.rejects(analyzeMessages(chat, key, { fetchImpl: async () => new Response('not JSON') }), /无法解析/);
  await assert.rejects(analyzeMessages(chat, key, { fetchImpl: async () => Response.json({ answers: [] }) }), /数量不完整/);
});
test('timeout and cancellation stop waiting without automatic retry', async () => {
  const fetchImpl = async (_, { signal }) => new Promise((resolve, reject) => {
    if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
    else signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  await assert.rejects(analyzeMessages(chat, key, { fetchImpl, timeoutMs: 5 }), /超过 45 秒/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(analyzeMessages(chat, key, { fetchImpl, signal: controller.signal }), /已取消/);
});
test('renderer escapes hostile content and excludes editor controls from exports', () => {
  const messages = [{ side: 'left', text: '<script>alert("x")</script> & hello', rating: 'brilliant' }];
  const layout = layoutMessages(messages, text => text.length * 20);
  const svg = renderSVG(layout);
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));
  assert.ok(!svg.includes('role="button"'));
  assert.ok(!svg.includes('foreignObject'));
  assert.ok(renderSVG(layout, { interactive: true }).includes('role="button"'));
  assert.equal(escapeXML('&<>"\''), '&amp;&lt;&gt;&quot;&apos;');
});
test('wrapping handles long words, CJK, emoji and explicit newlines', () => {
  const measure = text => Array.from(text).length;
  const lines = wrapText('abcdefghijkl\n中文测试😀😀', measure, 5);
  assert.deepEqual(lines, ['abcde', 'fghij', 'kl', '中文测试😀', '😀']);
  assert.deepEqual(wrapText('a\n\nb', measure, 5), ['a', '', 'b']);
});
test('long exports cover the whole conversation with bounded contiguous pages', () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({ side: index % 2 ? 'left' : 'right', text: '中'.repeat(650), rating: 'book' }));
  const layout = layoutMessages(messages, text => text.length * 38);
  const pages = exportPages(layout);
  assert.ok(pages.length > 1);
  assert.equal(pages[0].top, 0);
  assert.equal(pages.at(-1).top + pages.at(-1).height, layout.height);
  pages.forEach((page, i) => { assert.ok(page.height > 0 && page.height <= 4000); if (i) assert.equal(page.top, pages[i - 1].top + pages[i - 1].height); });
});
