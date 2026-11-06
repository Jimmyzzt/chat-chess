# Chat Chess

把聊天变成国际象棋复盘梗图。原生 HTML / CSS / JavaScript，零运行时依赖，移动端可用。内置参考图六条英文消息，打开即可编辑和导出，无需 Key。

[在线使用](https://jimmyzzt.github.io/chat-chess/) · [GitHub 仓库](https://github.com/Jimmyzzt/chat-chess) · [图标下载来源](ICONS.md)

## 本地运行

需要 Node.js 22 或更新版本。

```sh
npm install
npm run dev
```

打开终端显示的 `http://localhost:8787`。无需构建。测试不需要真实 Key：

```sh
npm test
npm run capacity
npm run deploy:check
```

## 使用

- 点击聊天气泡或徽章：修改文字、左右侧、评价，或删除消息。支持键盘 Tab、Enter 和 Escape。
- “添加消息”新增一条；“粘贴对话”自动识别微信复制的“昵称、日期时间、消息内容”，或 `A: …` / `B: …` / `昵称: …`（支持中文冒号和续行），替换当前对话。微信记录支持同一分钟多人发言、同一人连续发言和多行内容；当前不处理图片/语音附件文件本体。
- 群聊保留每位发言者的独立 ID，在导入框或预览上方选择唯一的“右侧角色”，其余人都在左侧。调整左右侧只影响排版，不会把左侧多人合并成一个 AI 发言者，也不会触发网络请求或清除已有评价。编辑单条消息时调整位置会移动该角色的所有消息。
- “显示 ID”和“显示头像”独立开关，预览和导出一致。头像用 ID 前两个可见字符居中、配稳定的低饱和纯色底；支持中文、英文和组合 Emoji。微信记录导入后默认显示 ID/头像，还原原图示例后默认隐藏。隐藏是视觉设置，不会匿名化发送给 AI 的身份数据。
- ID 紧贴气泡上方；聊天字号可调 24–48（以 720px 宽导出排版为基准），自动重新换行并调整气泡高度，预览和 PNG 导出一致。
- 可本地导入 `brilliance_v2.zip`，将预览、图例和 PNG 切换为社区图标。包不上传、刷新后清除，公开仓库不分发原素材；使用条件与 MIT 排除范围见 [第三方说明](THIRD_PARTY_NOTICES.md)。
- 最多 30 条消息，文字和每条角色 ID 总计不超过 20,000 个 JavaScript 字符（UTF-16 code units）；ID 最长 80 字符。空消息不允许。
- 手动选评价后自动标记为“手动”；原值未变时可勾选手动选项。来源在消息编辑窗口显示：示例、AI、手动、未评价、AI 拒绝评价。
- AI 重跑保留手动标记。选择“未标记”并保存可解除手动评价，让 AI 重新评价该条。修改文字、切换说话者、添加/删除消息会清除旧 AI 评价，因为完整语境已改变；原有手动标记继续保留。修改示例/AI 消息时想保留当前评价，可同时勾选手动选项。
- 高清 PNG 仅含白底、聊天气泡、SVG 徽章及按开关显示的 ID/头像。预览与导出共用 SVG 排版，无远程字体、无截图依赖。标准导出宽 1440px；超长对话分成多张 PNG（每张最高 8000px），尽量在消息之间分页，单条超长消息必要时跨页。多图提供逐张下载链接，避免浏览器拦截批量下载。
- 聊天、Key 和设置不写入任何浏览器持久化存储；刷新后回到示例。切离页面时清除 Key，导出的文件由用户自行保存。

## 架构：完全静态，浏览器直连

```text
浏览器 ── GET 静态文件 ──> Cloudflare Static Assets / 任意静态托管
浏览器 ── POST /v1/decisions ──> api.openai.com
浏览器 ── POST /chat/completions ──> api.deepseek.com（选择其一）
浏览器 ── 读取用户本地 ZIP ──> 内存内图标（不上传）
浏览器 ── SVG → Canvas → PNG ──> 本地文件
```

没有 `src/worker.js`、`main`、ASSETS binding、`run_worker_first`、数据库、账号、服务端 Key 或分析 SDK。`wrangler.jsonc` 只声明 `public/` 静态目录，未知路径返回 404。不要加将所有流量转入脚本的路由或代理。

这有意调整了参考方案中的 Worker 转发要求，以用户的纯静态与请求额度要求为优先。2026-11-06 实测 Decisions 的无认证 OPTIONS 跨域预检返回 200，允许 `POST, OPTIONS`、`authorization, content-type`，`Access-Control-Allow-Origin: *`。这只是当时的跨域实测，不代表拥有真实账户权限，也不保证未来策略不变。

## 请求扇出与容量

| 操作 | 静态 HTTP 请求 | 本站 Worker 计算调用 / 子请求 | 所选 AI 服务请求 |
| --- | --- | --- | --- |
| 首次打开 | 8 个文件：HTML、CSS、5 个 JS、favicon（浏览器时序可能不同） | 0 / 0 | 0 |
| 编辑、手动改评价、还原示例、粘贴 | 0 | 0 / 0 | 0 |
| 每次 AI 复盘（最多 30 条） | 0 | 0 / 0 | 1 POST，可能另有 1 OPTIONS 预检 |
| 导出 PNG | 0（blob URL 在本地） | 0 / 0 | 0 |

两种 AI 服务都一次性分析整段对话：OpenAI 每条消息一个 `move_N` question；DeepSeek 使用一个 JSON 输出数组，包含每条消息的同名评价，全部合并在一个 POST 中。输入保留各角色 ID，日期时间用于解析/本地记录，不发送给 AI。没有每消息一次调用、轮询、健康探测或自动重试，也不自动切换服务商。每个页面同时只允许一个 AI 请求，超时 45 秒；取消仅停止本地等待，上游仍可能完成并计费。双击不会重复发送。字号、头像和 ZIP 图标导入均不产生网络请求。

按公开 Workers Free 限制做容量预算（**不是已核验的实际账号套餐**）：100,000 次脚本请求/天、10ms CPU、50 子请求/次、128MB 内存；静态文件每版本最多 20,000 个、单文件最多 25MiB。此实现无计算脚本，所以这些计算额度不构成页面访问或 AI 复盘的计次瓶颈；静态资产请求免费且不限次数，静态存储无额外收费。`npm run capacity` 实测文件数/大小，并将项目预算限制在 Free 文件数及单文件限制的 10% 以内，保留至少 90% 余量。

估算 100,000 次冷访问 = 约 800,000 次静态资源 HTTP 请求、0 次脚本调用；即使 1,000 人同时复盘，本站仍是 0 次脚本调用，客户端会发出总计 1,000 个所选服务的 POST，另有至多 1,000 个 OPTIONS。实际模型额度受各访问者自己的账户余额、地区、RPM/TPM 等限制，与 Cloudflare 计算额度独立。不要把所有 HTTP 请求都叫作 Worker 计算调用，也不要把“缓存命中”当成免调用的原因。

## BYOK 安全边界

OpenAI 官方通常建议将长期密钥放在服务端，浏览器 SDK 默认禁止使用 Key。本项目采用用户自己输入的 BYOK，为满足完全静态部署选择直接 `fetch`，没有隐藏的服务器中转。

Key 仅在当前页面的密码输入框及请求的短暂内存中，不写 localStorage、sessionStorage、Cookie、URL 或文件，不输出日志。服务只能在固定的 OpenAI Decisions / `gpt-6-luna` 与 DeepSeek Chat Completions / `deepseek-flash` 之间选择，不允许自定义上游、模型、请求头。切换服务会清空 Key 和发送确认，避免将 Key 发给错误服务；不发送 Cookie、不跟随重定向、不缓存 API 响应。HTTP 错误只映射为通用错误，不显示上游正文。

**内存存放不能使浏览器 Key 绝对安全**：页面 JS、恶意扩展或被篡改的托管文件仍可读取它；站点运营者也能通过更新前端接触后续输入的数据。不要在源码中内置公共 Key。建议本地或自托管、使用专用受限 Key，配置 OpenAI 账户预算提醒与权限，并注意预算提醒不一定是消费硬上限。可以完全不填 Key，只用手动制图。

Cloudflare 用 `public/_headers` 设置严格 CSP（仅允许连接 OpenAI 和 DeepSeek 官方 API、脚本仅本域）、禁止 iframe、禁用摄像头/麦克风、无 referrer。HTML 同时携带 CSP meta，保证 GitHub Pages 上也限制脚本和连接来源。GitHub Pages 不应用 `_headers` 自定义头，所以 X-Frame-Options、Permissions-Policy 和 CSP frame-ancestors 的 Cloudflare 响应头保护不适用于 Pages；请求本身仍使用 no-referrer 和 no-store。无内联脚本、第三方 JS、广告、遥测或远程字体。其他静态托管需自行设置响应头。HTTPS 发布；本地 localhost 可用于开发。不要直接双击 HTML，因为 ES modules 需要 HTTP 环境。

## GitHub Pages 部署（当前发布方式）

公开仓库主分支 push 后，`.github/workflows/pages.yml` 先运行无需安装依赖的测试和容量检查，再把 `public/` 作为 Pages artifact 发布。网页资源均使用相对路径，可部署到 `/chat-chess/` 子目录；`.nojekyll` 禁用 Jekyll 处理。仓库 Settings → Pages 的发布来源选择 GitHub Actions。

GitHub Pages 对公开仓库在 GitHub Free 及以上套餐可用。本次 CLI 已确认目标为个人账号 Jimmyzzt，认证接口没有返回套餐名称，所以没有据此声称账号是某一付费套餐；Pages 启用与实际部署结果用于核验该账号可用性，不购买计划、不新增计费服务。发布前核对的[官方 Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)：站点不超过 1GB，软带宽 100GB/月，部署最长 10 分钟；自定义 Actions workflow 不受每小时 10 次 Pages build 软限制影响。没有 Worker CPU、子请求或数据库存储消耗；Actions runner 的开销仅在发布时发生。

当前发布目录约 61KB、12 个文件、最大单文件不足 16KB，远低于站点容量限制；按每次冷访问上界 70KB 估算，100,000 次约 7GB/月，500,000 次约 35GB/月，预留约 65% 软带宽预算。并发 1,000 次冷访问约 8,000 个静态请求、70MB 传输；群聊头像和用户导入的社区图标均在本地生成，不新增请求。未进行生产压力测试；平台仍可自主限流。

Pages 带宽/平台限流或托管故障可能使新访问返回 429/不可达，不能保证静态资源在托管额度耗尽后依然可取。已经加载的页面仍能离线编辑与导出，API 故障只影响 AI。备用为本地运行或将同一 `public/` 部署至 Cloudflare Static Assets。回滚可恢复上一份源代码再 push 触发 workflow，无数据迁移。

## AI 规则与接口

使用 [Decisions guide](https://developers.openai.com/api/docs/guides/decisions) 和 [Create decision](https://developers.openai.com/api/reference/resources/decisions/methods/create) 的 choice schema：`choices: [{ value, description }]`，按唯一 question 名称映射 `answers`，提取 `choice` 和 `confidence`。同时处理 `type: refusal`，不把拒绝当成普通评价。无自然语言评语请求。

默认提供 DeepSeek 选项，按 [DeepSeek JSON Output](https://api-docs.deepseek.com/zh-cn/guides/json_mode/) 与 [Chat Completions](https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/) 文档调用 `https://api.deepseek.com/chat/completions`：`model: deepseek-flash`、`thinking: {type: disabled}`、`response_format: {type: json_object}`、`max_tokens: 2048`、非流式。Prompt 包含 JSON 样例，要求 `{"moves":[{"name":"move_0","rating":"book"}]}`。校验完整数量、唯一名称及类别；空白内容、非 JSON、截断、缺失/重复结果均显示错误，保留现有评价，不自动重试。DeepSeek JSON 分类没有 Decisions 的结构化 confidence 字段，因此不生成或展示虚构百分比。

2026-11-06 使用 Pages origin 对 DeepSeek 发出无认证 OPTIONS 实测 200，允许 POST 与 authorization/content-type，返回匹配的 Access-Control-Allow-Origin。真实有效 Key 的成功请求未执行；需要该服务自己的有效 API Key 和可用余额，聊天网页账号不等于 API 额度。

Book 是常见开场；Good 是稳妥延续；Best 是适合语境的优秀回应；Great 是创造机会的精彩发言；Brilliant 是稀有的意外反转；Inaccuracy、Mistake、Blunder 分别表示小失误、明确错误和重大反噬。评价语境效果，考虑讽刺、双关、后续反转；严格区分 A/B，不按语法、礼貌或冒犯强度打分，不强制产生神操作或大失误。置信度不等于客观正确率，评价只适合娱乐。

## Cloudflare 部署

保留 Cloudflare 作为备用部署方式。**发布前**需在 Dashboard 确认目标账号实际套餐、当日额度、静态文件数/单文件限制和域名配置，对照上方预算与 `npm run capacity` 输出；不自动开通任何付费计划。

```sh
npx wrangler login
npx wrangler whoami
npm run deploy:check
npm run deploy
```

如有多个账号，部署前在 `wrangler.jsonc` 指定正确的 `account_id`。发布后检查 HTML/CSS/JS 响应、`_headers`、移动端交互，并在 Workers Metrics 确认 **静态资产请求与脚本调用分开计数**。本项目没有脚本，不应产生脚本调用。

参考：[Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)、[Platform limits](https://developers.cloudflare.com/workers/platform/limits/)、[Static Assets configuration](https://developers.cloudflare.com/workers/static-assets/binding/)、[OpenAI browser key guidance](https://developers.openai.com/api/reference/typescript)。

## 失败行为与回滚

- OpenAI/DeepSeek 的 401/402/403/422/429/5xx、网络失败、跨域失败、45 秒超时、结构错误：显示可读错误，不清空已有评价，手动编辑与 PNG 导出仍可用；不自动转代理、切换服务或重试。
- 个别问题拒绝：该条未评价，可手动标记；其余有效结果照常显示。手动标记始终优先保留。
- Workers 计算额度耗尽：本方案不依赖计算脚本，静态资源继续由 Assets 服务；不需要额度耗尽后才触发 fallback。远端平台故障或整个站点不可达与计算额度耗尽不同，首次访问仍可能失败。
- 备用访问：同一 `public/` 可复制到任意静态托管或用本地 HTTP 服务打开；已加载的页面断网后仍能编辑、导出（刷新/冷启动离线未承诺，不额外实现 Service Worker）。
- 回滚：保留上一份源码/lockfile，在旧版本目录执行 `npm ci && npm run deploy`，或按 Cloudflare 部署历史恢复上一版本；无数据库或数据迁移。不要在示例代码中放 Key。

## 验证范围

`npm test` 用 Node 原生测试及模拟 fetch 验证输入边界、参数构造、乱序映射、拒绝/重复/缺失结果、单 POST、敏感正文不外泄、401/403/429/5xx、网络失败、超时/取消、SVG 文本转义、换行与超长分页。真实有效 Key 的计费请求未执行；真实账户的地区、余额和 API 权限需用户实际使用时验证。

开发依赖只有 Wrangler；运行时零依赖。源代码与默认原创 SVG 按 MIT License 开放；用户导入的第三方素材、示例对话及梗图参考素材权利归原权利人，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
