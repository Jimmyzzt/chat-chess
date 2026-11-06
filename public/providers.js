import { ENDPOINT, RATINGS, RULES, conversationInput, validateMessages, requestJSON, analyzeMessages } from './core.js';

export const PROVIDERS = {
  deepseek: { label: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-flash' },
  openai: { label: 'OpenAI', endpoint: ENDPOINT, model: 'gpt-6-luna' }
};
export function buildDeepSeekRequest(messages) {
  validateMessages(messages);
  const rubric = Object.entries(RATINGS).map(([value, rating]) => `${value}: ${rating.description}`).join('\n');
  return {
    model: PROVIDERS.deepseek.model,
    thinking: { type: 'disabled' },
    response_format: { type: 'json_object' },
    max_tokens: 2048,
    stream: false,
    messages: [
      { role: 'system', content: `${RULES}\n${rubric}\nReturn only a JSON object with a moves array. Give exactly one item per input move. Use unique names move_0 through move_${messages.length - 1} and a rating from the rubric. Do not include explanations or confidence numbers. Example JSON: {"moves":[{"name":"move_0","rating":"book"}]}` },
      { role: 'user', content: conversationInput(messages) }
    ]
  };
}
export function mapDeepSeekAnswers(response, count) {
  const choice = response?.choices?.[0];
  if (choice?.finish_reason !== 'stop') throw new Error(choice?.finish_reason === 'length' ? 'DeepSeek 输出被截断，当前标记未更改；请稍后手动重试。' : 'DeepSeek 未完成评价，当前标记未更改。');
  const content = choice.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('DeepSeek 返回空内容，当前标记未更改；请稍后手动重试。');
  let data;
  try { data = JSON.parse(content); } catch { throw new Error('DeepSeek 返回的 JSON 无法解析，当前标记未更改。'); }
  if (!Array.isArray(data?.moves) || data.moves.length !== count) throw new Error('DeepSeek 返回的评价数量不完整，当前标记未更改。');
  const byName = new Map();
  for (const move of data.moves) {
    if (!move || typeof move.name !== 'string' || !/^move_\d+$/.test(move.name) || byName.has(move.name) || typeof move.rating !== 'string' || !Object.hasOwn(RATINGS, move.rating)) throw new Error('DeepSeek 返回的评价格式无效，当前标记未更改。');
    byName.set(move.name, move.rating);
  }
  return Array.from({ length: count }, (_, index) => {
    const rating = byName.get(`move_${index}`);
    if (!rating) throw new Error('DeepSeek 返回的评价名称不完整，当前标记未更改。');
    return { rating, source: 'ai', provider: 'deepseek' };
  });
}
export async function analyzeWithProvider(messages, key, provider, options = {}) {
  if (!Object.hasOwn(PROVIDERS, provider)) throw new Error('请选择受支持的 AI 服务。');
  if (provider === 'openai') return (await analyzeMessages(messages, key, options)).map(result => ({ ...result, provider }));
  const body = buildDeepSeekRequest(messages);
  const response = await requestJSON(PROVIDERS.deepseek.endpoint, body, key, { ...options, providerLabel: 'DeepSeek' });
  return mapDeepSeekAnswers(response, messages.length);
}
