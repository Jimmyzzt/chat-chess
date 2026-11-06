# Chat Chess

像复盘棋局一样给聊天打分，制作聊天梗图。

[在线使用](https://jimmyzzt.github.io/chat-chess/) · [源码](https://github.com/Jimmyzzt/chat-chess)

## 功能

- 编辑、添加、删除消息，手动修改棋步标记。
- 粘贴微信聊天记录或“昵称: 内容”，支持群聊并选择右侧角色。
- 完整显示名字，可开关 ID/头像、调节字号。
- 首次跟随系统外观；支持浅色、深色及跟随系统，记住手动选择。
- 导出 1440px 宽 PNG，排版、颜色与预览一致；超长对话自动分页。
- 可选 DeepSeek（deepseek-flash / JSON）或 OpenAI（gpt-6-luna / Decisions）复盘。

## 本地运行

Node.js 22+：

```sh
npm install
npm run dev
```

打开终端显示的本地地址。无需构建。

```sh
npm test              # 无需真实 Key
npm run capacity      # 静态容量与请求数量
npm run deploy:check  # Cloudflare 打包检查
```

## AI 与隐私

无需 Key 即可手动制图。AI 复盘需要所选服务自己的有效 API Key 和可用余额；浏览器直接请求官方接口，本页面无任何转发服务。

Key、聊天不持久保存，刷新后清空；只有外观偏好写入 localStorage。切换 AI 服务会清除 Key 和发送确认。浏览器扩展或被篡改的页面仍可能读取 Key，建议使用专用受限 Key。

最多 30 条消息，文字与 ID 合计不超过 20,000 个 UTF-16 字符。每次复盘只发送一个 POST，可能另有一次跨域预检，不自动重试或切换服务。失败保留现有标记，手动标记不会被 AI 覆盖。评价仅供娱乐；真实 Key 成功请求未代用户测试。

## 部署

当前使用 GitHub Pages：推送 main 后，Actions 自动测试并发布 public/。也可运行 npm run deploy 发布至 Cloudflare Static Assets。

页面完全静态，无 Worker 脚本、数据库、账号系统或运行时依赖。首次约 7 个静态请求；编辑、外观切换、导出均不产生网络请求。发布前运行容量检查并核对实际托管套餐；Pages 的站点上限 1GB、软带宽 100GB/月，项目按每次冷访问 70KB 做保守预算，50 万次约 35GB，保留余量。不自动开通付费计划。

托管故障或限流可能影响新访问；已加载页面仍能编辑和导出，AI 故障仅影响复盘。备用方式为本地运行或复制 public/ 到其他静态托管。回滚恢复上一版本代码并推送即可。

详细记录见 [VALIDATION.md](VALIDATION.md)。代码与原创 SVG 使用 [MIT License](LICENSE)，第三方素材边界见 [说明](THIRD_PARTY_NOTICES.md)。`nPages 发布会自动为 CSS、JS 和图标生成版本文件名，避免浏览器缓存造成新版页面与旧样式混用。本地开发仍无需构建。
