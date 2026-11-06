import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeepSeekRequest, mapDeepSeekAnswers, analyzeWithProvider, PROVIDERS } from '../public/providers.js';
import { layoutMessages, renderSVG } from '../public/render.js';
import { loadCommunityPack } from '../public/icons.js';
const chat = [{ side: 'left', speaker: '林', text: '你好' }, { side: 'right', speaker: 'River', text: 'hello' }];
const moves = [{ name: 'move_1', rating: 'best' }, { name: 'move_0', rating: 'book' }];
const response = (content = JSON.stringify({ moves }), finish_reason = 'stop') => ({ choices: [{ finish_reason, message: { content } }] });
test('DeepSeek uses JSON mode, fixed model and bounded non-thinking output', () => {
  const body = buildDeepSeekRequest(chat);
  assert.equal(body.model, 'deepseek-flash'); assert.equal(body.response_format.type, 'json_object');
  assert.equal(body.thinking.type, 'disabled'); assert.equal(body.max_tokens, 2048); assert.equal(body.stream, false);
  assert.match(body.messages[0].content, /JSON/); assert.match(body.messages[0].content, /"moves"/);
  assert.equal(JSON.parse(body.messages[1].content)[1].speaker, 'River');
  assert.ok(!body.messages[0].content.includes(chat[0].text));
});
test('DeepSeek maps by name and never fabricates calibrated confidence', () => {
  const results = mapDeepSeekAnswers(response(), 2);
  assert.deepEqual(results.map(result => result.rating), ['book', 'best']);
  assert.ok(results.every(result => result.provider === 'deepseek' && result.source === 'ai' && !Object.hasOwn(result, 'confidence')));
});
test('DeepSeek rejects empty, truncated, partial, duplicate and invalid JSON results', () => {
  for (const invalid of [response(' '), response('broken'), response('{}'), response(JSON.stringify({ moves: [moves[0]] })), response(JSON.stringify({ moves: [moves[0], moves[0]] })), response(JSON.stringify({ moves: [moves[0], { name: 'move_0', rating: 'fake' }] })), response(JSON.stringify({ moves: [moves[0], { name: 'move_8', rating: 'book' }] })), response(undefined, 'length'), response(undefined, 'content_filter')]) assert.throws(() => mapDeepSeekAnswers(invalid, 2));
});
test('DeepSeek sends one POST, never falls back or retries, and keeps credentials out of body', async () => {
  let calls = 0;
  const results = await analyzeWithProvider(chat, 'sk-placeholder-for-test', 'deepseek', { fetchImpl: async (url, options) => {
    calls++; assert.equal(url, PROVIDERS.deepseek.endpoint); assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.ok(!options.body.includes('sk-placeholder')); return Response.json(response());
  } });
  assert.equal(calls, 1); assert.equal(results.length, 2);
  for (const status of [401, 402, 403, 422, 429, 500, 503]) {
    calls = 0;
    await assert.rejects(analyzeWithProvider(chat, 'sk-placeholder-for-test', 'deepseek', { fetchImpl: async () => { calls++; return { ok: false, status, json: () => { throw Error('sensitive'); } }; } }), error => !error.message.includes('sensitive'));
    assert.equal(calls, 1);
  }
  await assert.rejects(analyzeWithProvider(chat, 'sk-placeholder-for-test', 'unknown'));
});
test('font size changes wrapping, bubble height and SVG text consistently', () => {
  const make = fontSize => layoutMessages([{ side: 'left', speaker: '林', text: '长'.repeat(50) }], text => text.length * fontSize, { fontSize, showIds: true });
  const small = make(24), large = make(48);
  assert.ok(large.items[0].lines.length > small.items[0].lines.length);
  assert.ok(large.height > small.height);
  assert.match(renderSVG(small), /font-size="24"/); assert.match(renderSVG(large), /font-size="48"/);
  assert.match(renderSVG(large), new RegExp(`y="${large.items[0].y - 8}"`));
  assert.equal(layoutMessages(chat, text => text.length, { fontSize: NaN }).fontSize, 38);
});
test('local icon importer rejects oversized or malformed archives before changing icons', async () => {
  await assert.rejects(loadCommunityPack(new Blob(['not a zip'])), /ZIP/);
  await assert.rejects(loadCommunityPack({ size: 9 * 1024 * 1024 }), /8MB/);
});
