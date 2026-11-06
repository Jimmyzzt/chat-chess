# 本地验收记录

日期：2026-11-06（Asia/Shanghai）。环境：Windows、Node.js 24.19.0、Wrangler 4.158.0。

- `npm test`：19/19 通过；全部 API 调用使用模拟响应，不需要真实 Key。新增微信昵称/时间/多行解析、群聊身份、角色切换、头像生成、ID/头像开关及 AI 结果身份保留测试。
- `npm run deploy:check`：初始 assets-only 配置通过；GitHub Pages workflow 只上传 `public/`，不安装运行时依赖。
- `npm run capacity`：9 个文件，共 46,406 bytes；最大文件 13,100 bytes。`_headers` 和 `.nojekyll` 是部署配置，首次页面加载只请求 HTML、CSS、3 个 JS、favicon，共 6 个静态资源。
- 本地 GET `/` 返回 200；未知 `/api/analyze` 返回 404；CSP、Referrer-Policy、X-Content-Type-Options、X-Frame-Options 等响应头生效。
- 无认证 OPTIONS `https://api.openai.com/v1/decisions`：200，允许 POST/OPTIONS、authorization/content-type、origin `*`。没有测试真实账户权限、有效 Key 成功响应或实际计费。
- 浏览器实测六条示例、手动改评价及来源显示、中文冒号和续行粘贴、新增/删除、还原示例、无 Key 时展开设置。
- 原图示例 PNG 实际下载成功，1440 × 1424，只有气泡和标记；微信群聊含 ID/头像的 PNG 也在浏览器实际生成成功，提供下载链接。预览/导出共用 SVG 布局。验收产物在本地 `artifacts/`，不提交公开仓库。
- 手机和桌面布局检查完成，无横向溢出。截图见 `artifacts/mobile-preview.jpg` 和 `artifacts/desktop-preview.jpg`。
- 浏览器日志未发现 error/warn。实测微信导入识别 4 条消息、3 位角色，选择右侧角色、独立隐藏 ID/头像、群聊 PNG 导出成功。长图分页、拒绝评价、超时/取消、错误响应及手动结果保留通过定向自动测试。

当前计算扇出：访问/编辑/导出为本站 0 次 Worker 计算调用；一次 AI 复盘为本站 0 次 Worker 计算调用、0 次 Worker 子请求，客户端 1 次 OpenAI POST，加至多 1 次预检。不自动重试。

GitHub 目标账号：Jimmyzzt。CLI 认证有效，token 没有返回套餐名称；公开仓库 Pages 在 Free 及以上套餐支持，无需升级。发布前按官方 Pages 1GB 站点 / 100GB 月软带宽 / 10 分钟部署限制做预算；资源不足 50KB，1,000,000 次冷访问上界约 50GB，保留至少一半带宽余量。仓库启用 Pages 后由 `.github/workflows/pages.yml` 发布，最终状态以 GitHub Actions 和线上 URL 为准。

尚未验证：实际 Cloudflare 账号套餐与额度、生产压力/故障注入及真实模型评价质量。没有开通付费服务。Pages 托管故障/限流时，新访问可能失败；已加载页面可继续本地编辑和导出，备用为本地运行或 Cloudflare Static Assets。

本次受限执行环境无法写 Wrangler 默认用户目录，因此启动和打包检查将 `WRANGLER_LOG_PATH`、本地 dev 的 `WRANGLER_REGISTRY_PATH` 重定向到项目 `.wrangler/`，没有修改系统配置或全局用户设置。普通用户终端可以直接运行 `npm run dev`。
