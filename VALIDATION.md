# 本地验收记录

日期：2026-11-06（Asia/Shanghai）。环境：Windows、Node.js 24.19.0、Wrangler 4.158.0。

- 
pm test`：25/25 通过；全部 API 调用使用模拟响应，不需要真实 Key。新增 DeepSeek JSON 请求、完整映射、空白/截断/格式错误、HTTP 错误、单 POST 无自动重试、字号换行与恶意 ZIP 输入检查。
- 
pm run deploy:check`：初始 assets-only 配置通过；GitHub Pages workflow 只上传 `public/`，不安装运行时依赖。
- 
pm run capacity`：12 个文件，共 60,596 bytes；最大文件 15,212 bytes。首次页面加载 HTML、CSS、5 个 JS、favicon，共 8 个静态资源；图标 ZIP 从用户文件本地读取，不新增 HTTP 请求。
- 本地 GET `/` 返回 200；未知 `/api/analyze` 返回 404；CSP、Referrer-Policy、X-Content-Type-Options、X-Frame-Options 等响应头生效。
- 无认证 OPTIONS `https://api.openai.com/v1/decisions`：200，允许 POST/OPTIONS、authorization/content-type、origin `*`。没有测试真实账户权限、有效 Key 成功响应或实际计费。
- 无认证 OPTIONS `https://api.deepseek.com/chat/completions`（Origin 为 Pages）：200，允许 POST、authorization/content-type，allow-origin 匹配。DeepSeek 有效 Key 成功响应与真实评价质量未验证。
- 浏览器实测六条示例、手动改评价及来源显示、中文冒号和续行粘贴、新增/删除、还原示例、无 Key 时展开设置。
- 原图示例 PNG 实际下载成功，1440 × 1424，只有气泡和标记；微信群聊含 ID/头像的 PNG 也在浏览器实际生成成功，提供下载链接。预览/导出共用 SVG 布局。验收产物在本地 `artifacts/`，不提交公开仓库。
- 手机和桌面布局检查完成，无横向溢出。截图见 `artifacts/mobile-preview.jpg` 和 `artifacts/desktop-preview.jpg`。
- 浏览器日志未发现 error/warn。实测微信导入识别 4 条消息、3 位角色，选择右侧角色、独立隐藏 ID/头像、群聊 PNG 导出成功。长图分页、拒绝评价、超时/取消、错误响应及手动结果保留通过定向自动测试。
- 本次在浏览器中用用户的 `brilliance_v2.zip` 成功导入八个 SVG；预览和图例同步替换，24 字号含社区图标的 PNG 实际生成成功。素材与压缩包未提交公开仓库。社区整理包没有再分发许可，边界见 THIRD_PARTY_NOTICES.md。
- 字号 24 和 48 两端已实测；ID 基线为气泡上方 8 个排版像素（原先 42），不再留大块空白。手机无横向溢出。截图 `artifacts/icons-font-preview.jpg` 为本地验收产物，不公开分发。
- 实测切换 AI 服务会清空 Key 和发送确认；DeepSeek JSON 结果不展示虚构置信度。未使用真实 Key 发出计费请求。

当前计算扇出：访问/编辑/导出/本地导入为本站 0 次 Worker 计算调用；一次 AI 复盘为本站 0 次 Worker 计算调用、0 次 Worker 子请求，客户端 1 次所选 AI 服务的 POST，加至多 1 次预检。不自动重试或切换服务。

GitHub 目标账号：Jimmyzzt。CLI 认证有效，token 没有返回套餐名称；公开仓库 Pages 在 Free 及以上套餐支持，无需升级，前次实际部署成功已验证可用性。发布前重新核对官方 Pages 1GB 站点 / 100GB 月软带宽 / 10 分钟部署限制；资源约 61KB，按 70KB 冷访问上界估算，500,000 次约 35GB，保留约 65% 带宽余量。由 `.github/workflows/pages.yml` 发布，最终状态以 GitHub Actions 和线上 URL 为准。

尚未验证：实际 Cloudflare 账号套餐与额度、生产压力/故障注入及真实模型评价质量。没有开通付费服务。Pages 托管故障/限流时，新访问可能失败；已加载页面可继续本地编辑和导出，备用为本地运行或 Cloudflare Static Assets。

本次受限执行环境无法写 Wrangler 默认用户目录，因此启动和打包检查将 `WRANGLER_LOG_PATH`、本地 dev 的 `WRANGLER_REGISTRY_PATH` 重定向到项目 `.wrangler/`，没有修改系统配置或全局用户设置。普通用户终端可以直接运行 
pm run dev`。

本次小修：移除社区导入代码及两处提示，转发说明改为“本页面无任何转发服务。”；关闭按钮使用居中的 SVG 叉号。新增短气泡、左右侧及超长名字的完整显示回归测试，25 项测试通过。首次打开减为 7 个静态请求，仍为 0 Worker 调用。此前社区导入验收仅为历史记录，当前已移除。

外观更新：字号在桌面同排居中，小屏居中换行；首次跟随系统，可选浅色/深色并记住偏好，跟随系统模式监听系统变化。浏览器实测深色、浅色、跟随系统和刷新保留偏好，手机无横向溢出；PNG 深色配色通过定向测试。26 项测试通过。只将外观选择存入 localStorage，Key 和聊天不持久化。README 已精简。

缓存修复：Pages 的 CSS 响应缓存为 600 秒；发布阶段改为生成版本文件名，HTML 与模块依赖统一引用同一版本。新增打包回归测试，27 项测试通过；仍为 7 个静态请求、0 Worker 调用。
