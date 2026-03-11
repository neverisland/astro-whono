# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow Semantic Versioning.


## [Unreleased]
### Added
- 新增本地主题设置页 `/admin/`，用于集中编辑站点标题、默认描述、页脚版权、首页导语、栏目副标题和 Bits 默认作者等主题配置
- 新增侧栏设置，支持修改站点名、引用文案，以及既有导航项的名称、排序和显示状态
- 新增社交链接设置，支持维护 GitHub、X、Email 和最多 8 条自定义链接；关于页会同步显示
- 新增显示开关，支持控制阅读模式入口和代码行号
- 新增首页导语主文案 / 补充文案的独立展示开关，可在 `/admin/` 中分别控制首页是否渲染两段导语
- 新增本地配置保存机制；首次保存时生成本地配置文件，未生成前仍兼容旧配置读取

### Changed
- `/admin/` 的首页 Hero 配置改为真实生效：移除无实际语义的 `minimal` 选项，新增 `heroImageSrc` / `heroImageAlt`，支持 `src/assets/**`、`public/**` 与 `https://` 图片来源，并由首页直接消费
- 页脚、首页导语、侧栏和关于页社交信息改为读取统一配置，与 `/admin/` 设置保持一致
- `/admin/` 的社交链接表支持固定平台参与统一排序；GitHub / X / Email 保留预设语义，但可编辑位置排序
- `/admin/` 客户端控制器从页面内联脚本迁到 `src/scripts/admin-console/index.ts`，并抽出 `src/lib/admin-console/shared.ts` 统一收口共享规则与默认值
- `/admin/` 表单分组已拆到 `src/components/admin/`，社交链接子树也独立为组件，`src/pages/admin/index.astro` 进一步收敛为页面装配层
- `/admin/` 样式层已拆为 `admin-form` / `admin-social` / `admin-nav` / `admin-responsive` 四段，`src/styles/components/admin.css` 退化为聚合入口
- 首页现在按 `home.showIntroLead` / `home.showIntroMore` 配置决定是否渲染两段导语；补充导语支持在 `/admin/` 选择 `1-2` 个首页内部入口，前台继续按固定句式渲染，并对旧配置回退到 `归档 / 随笔`
- 生产环境中的 `/admin/` 保持只读，并从 sitemap 中排除
- `GET /api/admin/settings/` 改为开发态返回完整编辑载荷、生产态只返回安全只读响应，不再公开输出完整 Theme Console 配置
- Theme Console 的读写载荷边界统一为“可直接回写”的编辑模型，移除 `resolvedSocialItems` 等运行时派生字段
- Theme Console 多文件保存流程升级为 staged temp + commit/rollback，避免跨文件半成功状态
- 优化 `/admin/` Theme Console 的表单布局、提示文案与排序控件样式，提升本地配置台的一致性
- `/admin/` 的内页设置新增路径优先的“主标题 | 副标题”组合控件；`/essay/`、`/archive/`、`/bits/`、`/memo/`、`/about/` 可分别配置页面主副标题，`/memo/` 未填写时继续回退到 frontmatter

### Fixed
- 修复 `/admin/` 首次加载可能提示接口读取失败的问题
- 修复开发环境下 `/admin/` 偶发无法保存配置的问题
- 改进保存失败提示，便于区分空请求、JSON 格式错误和字段校验失败
- 修复开发态 `POST /api/admin/settings/` 缺少请求来源校验的问题；现在仅接受同源 `application/json` 请求
- 修复 `/admin/` 中将字段改回原值后仍被判定为“未保存更改”的问题
- 修复部分浏览器下 `/admin/` 离页提醒不触发确认对话框的问题

## [0.1.1] - 2026-02-07
### Added
- 新增 `public/_headers`（Cloudflare Pages 安全响应头基线：CSP/Referrer-Policy/X-Content-Type-Options/Permissions-Policy/HSTS）
- 新增 `netlify.toml` 固化 Netlify 构建与发布参数
- 新增 sitemap 与构建期 `robots.txt`（仅在设置 `SITE_URL` 时启用）
- 新增 `tools/charset-base.txt`（3500 常用字基础表）
- 新增通用 Lightbox 组件/脚本/样式（正文页与 bits 复用）
- 正文页（随笔/归档/小记）图片支持轻灯箱（禁用缩放/拖拽/下滑关闭）
- bits 新增轻量图片预览 dialog 与 Markdown 语法演示
- bits 支持作者覆盖（`author.name`/`author.avatar`）与草稿生成器作者输入
- 新增 `/archive/index.json` 与 `/essay/index.json` 静态搜索索引端点（构建期生成，可缓存）
- 新增 `src/scripts/entry-search.ts`，用于 archive/essay 懒加载索引搜索
### Changed
- 图标体系统一：`src/components/Icon.astro` 扩展并覆盖侧栏、阅读按钮、列表页与 `BitsDraftDialog` 常用图标，清理组件内联 SVG
- 浮层回顶按钮改为模板克隆：`src/layouts/BaseLayout.astro` 新增 `#scroll-top-template`，`src/scripts/sidebar-theme.ts` 改为克隆模板并绑定行为，移除 `innerHTML` 拼接 SVG
- 依赖治理优化：`@astrojs/check` 调整为 `devDependencies`，并新增 `overrides` 锁定 `fast-xml-parser`/`tar` 安全版本
- 新增 `npm run audit:prod`（`npm audit --omit=dev --audit-level=high`）并接入 GitHub Actions CI
- Markdown 渲染链路新增 `rehype-raw` + `rehype-sanitize`（含 allowlist），在保留 callout/gallery/code-block 等结构前提下补齐 XSS 防护
- /bits 列表渲染改为按正文长度分流：清洗后 `<=180` 字保留原 Markdown 结构渲染，`>180` 字显示摘要文本
- archive/essay 列表页与分页页复用 `src/lib/content.ts` 公共工具（`createWithBase`、`getPageSlice`、`getTotalPages`、`buildPaginatedPaths` 等）
- base-aware 路径拼接工具统一为 `src/utils/format.ts` 的 `createWithBase`，清理 BaseLayout/Sidebar/BitCard/RSS/首页/归档详情/bits 脚本中的重复 `withBase` 实现；`src/lib/content.ts` 保留兼容转导出
- `/archive/` 与 `/essay/`（含分页页）新增搜索框与搜索按钮，按索引匹配当前页条目并给出命中状态提示
- 构建时强制内联样式表（`inlineStylesheets: 'always'`），减少首屏阻塞
- `SITE_URL` 缺失时不输出 canonical/og:url，并补充生产警告与部署说明
- bits 灯箱复用通用控制器并统一样式入口（新增 `lightbox.css`）
- 可访问性增强：skip link、`sr-only` 标题、`:focus-visible`、/bits 搜索 label
- bits 图片字段升级为 `images[]`（Breaking：移除旧字段），并重做草稿录入与多图展示策略
- bits 多图展示与交互优化（缩略比例、`+N` 标签、移动端网格、平板泳道等）
- bits 作者与头像策略细化（默认入口、兜底、尺寸）
- 首页 Hero 图片改用 `astro:assets`（AVIF/WebP）与 LCP 控制
- 字体子集化与自托管（LXGW WenKai Lite / Noto Serif SC），移除大字体 preload
- 路由/集合调整：归档入口统一 `/archive/`，/essay 仅重定向，/memo 替代 /kids
### Fixed
- 修复 `src/scripts/lightbox.ts` 在 `exactOptionalPropertyTypes` 下的类型错误（避免 `npm run check` 失败）
- `robots.txt` 移除误导性的 sitemap 注释
- 统一 `page/` 保留 slug 过滤，避免列表与详情不一致导致潜在 404
- 修复 bits 多图 `+N` 点击无响应
- 修复灯箱遮挡与默认露出问题

## [0.1.0] - 2026-01-28 (Pre-release)
### Added
- 代码块工具栏（语言/行数/复制）与 Shiki 构建期注入
- Callout 语法糖管线（`remark-directive` + `remark-callout`）与 DOM 协议实现
- Figure/Caption 与 code-block 组件样式拆分并由 `global.css` 聚合
- bits 搜索索引端点 `/bits/index.json` 与可访问提示
- 客户端交互脚本目录 `src/scripts/`（搜索、主题/阅读模式）
- 移动端/平板回到顶部按钮（渐进增强）
- 文章详情上下篇导航
- CI 与本地聚合命令（`npm run ci`）
- 语言图标映射工具与图标依赖

### Changed
- 代码块变量与结构体系重构（含行号与复制按钮的增强）
- Markdown 指南与 README 补充 Callout / Figure 规则与示例
- `.prose` 排版与 `global.css` 入口拆分、导入顺序整理
- bits 搜索索引改为 JSON 懒加载并加入摘要
- 主题/阅读模式与搜索脚本迁移至 TS 模块，非沉浸页禁用提示
- 移动端断点与布局/触控优化（导航、列表、图像、工具栏等）
- 图标策略优化（logos 优先、别名补充）
- 文档目录结构调整与代码字体入口统一

### Fixed
- 修复暗色模式下纯文本代码块可读性
- 修复代码块语言图标 viewBox 裁切问题
- 修复阅读模式退出按钮错位
- 修复行内代码换行导致背景断裂
- 修复小屏长行内容撑宽导致横向滚动

## Pre-release（未发布历史）

### Added
- 新增最薄 `Callout.astro` 组件，统一输出 callout 结构与属性

### Changed
- callout 图标渲染改为 `.callout-title::before`，支持 `data-icon` 覆盖与 `data-icon="none"`
- callout 样式迁移到 `src/styles/components/callout.css`，`global.css` 使用 `@import` 聚合

### Added
- 增加 `@astrojs/check` 与 `typescript` 依赖以支持 `astro check`
- **夜间模式**：支持浅色/深色主题切换
  - 使用 `data-theme="dark"` 属性切换
  - 自动跟随系统偏好，支持手动切换
  - 切换按钮位于侧栏底部，带无障碍支持（`aria-pressed`、`aria-label`）
  - Shiki 代码高亮双主题（`github-light` / `github-dark`）
- 侧栏底部新增阅读模式与 RSS 按钮（黑白图标、悬停提示），阅读模式全站入口，文章/小记页支持沉浸阅读与退出按钮
- 小记页面 TOC 区域折叠指示器（三角形图标，展开/折叠时旋转）
- Initial Astro theme scaffold with fixed sidebar + content layout.
- Routes: `/`, `/archive/`, `/essay/`, `/bits/`, `/memo/`, `/about/`.
- Content Collections: `essay`, `bits`, `memo`.
- Bits draft generator: `npm run new:bit`.
- RSS endpoints: `/rss.xml`, `/archive/rss.xml`, `/essay/rss.xml`.

### Changed
- callout 样式改为极简竖线形态，移除背景/边框/标题分隔线
- callout 图标改为 `.callout-icon` 钩子，CSS mask 提供 SVG；tip 使用 Lucide sparkles 并设为低饱和绿
- 更新 Markdown 指南中的 callout 示例结构
- 正文图片统一最大宽度为 75% 并居中显示（`.prose img`）
- 小记示例内容替换为可开源保留的原创示例
- 配色调整为暖色调（Stone 色系）
- TOC 区域行间距增加（`gap: 14px`，一级标题间距 `20px`）
- 引用和代码块背景色改用 CSS 变量，适配夜间模式
- 引用样式优化：去除斜体，调整内边距
- 深色模式下 badge 与 bits 搜索按钮配色更统一，提升可读性
- 统一列表页标题结构，新增 `.page-header` 组件（主标题+副标题单行显示）
- 调整背景色为 `#fffefc`（米白色）
- 侧栏标题 hover 效果移除颜色变化，只保留放大
- 导航链接 hover 效果改为向左平移

### Fixed
- 修复 `astro check` 类型检查错误（隐式 `any`、DOM 类型收窄、小记 TOC 类型推断）
- 修正文档指引路径（AI-GUIDE 指向 docs）
- 修复引用内 `<p>` 标签默认 margin 导致的高度问题
- 修复深色模式代码块背景未切换、日间高亮被覆盖的问题

### Removed
- 清理未使用的 CSS 样式（`.bits-hero`、`.memo-subtitle`）
