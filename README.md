# TDK 的小窝

这是 thedyingkai_ 的个人静态博客，部署在 GitHub Pages。站点主要用于整理算法竞赛题解、数学与模板笔记、项目复盘和成长记录。

## 交换友链

你可以这样在你的网站填写我的友链：
|项目|值|
|-----|-----|
|站点名称|TDK 的小窝|
|站点 URL|https://blog.thedyingkai.cn|
|头像 URL|https://blog.thedyingkai.cn/assets/images/site/ico.png|
|RSS URL|https://blog.thedyingkai.cn/rss.xml|
|描述|华风夏韵，洛水天依。|

你可以这样将你的友链填写到我的网站：

- Fork 我的项目，找到友链文件 `config/friends.json`，在 `"links":` 内部加上你的信息。保存文件，提交、推送、PR

- 如果你还不清楚上面的操作如何完成，请查看 [友链·TDK 的小窝](https://blog.thedyingkai.cn/friends/) 页面，上面有详细教程。

## 更新文章

新增文章时，只需要把 Markdown 文件放到 `posts/`，文件名建议使用英文、数字和短横线，例如 `new-post.md`。

文章 front matter：

```markdown
---
title: 文章标题
description: 简短摘要
date: 2026.06.24
tags: [算法, 笔记]
---
```

文章封面默认不显示。需要封面时，在 front matter 里额外写：

```markdown
cover: 1.jpg
coverAlt: 图片描述
```

封面文件从 `assets/images/anime/` 读取，也可以写完整 URL。

## 更新图片

图片统一放在 `assets/images`。首页底层叠放图由 `config/images.json` 的 `homeHero.images` 控制。想加更多首页图片时，把图片放进 `assets/images/anime/`，再追加：

```json
{
  "src": "*.jpg",
  "alt": "图片描述"
}
```

## 更新静态资源版本

本地 CSS/JS 的缓存版本统一维护在 `config/asset-versions.json`。修改 `assets/` 下由页面直接引用的样式、脚本后，只需要在这个文件里提升对应资源的版本号，然后运行：

```bash
node scripts/sync-asset-versions.mjs
```

这个脚本会同步 HTML 中的资源引用，以及本地 JS 模块的 `from` / `import()` 引用中的 `?v=`。只想检查是否同步时运行：

```bash
node scripts/sync-asset-versions.mjs --check
```

GitHub Pages 部署流程也会运行同步脚本，确保线上构建使用同一份版本清单。

## 更新项目

项目页内容在 `config/projects.json`。新增项目时追加一个对象，常用字段包括 `title`、`meta`、`text`、`href`、`tags`。页面会自动按配置渲染卡片。

## 更新云盘

云盘页内容在 `config/cloud.json`。`folders` 定义目录，各目录的 `entries` 定义内容，子目录通过 `folder` 字段关联目录 ID。文件优先使用 `downloadUrl` 或 `href`；如果只写 `path`，页面会自动拼接到 `dl.thedyingkai.cn`。

## 更新关于页

关于页内容在 `config/about.json`，包括个人简介、链接、卡片和 Timeline。Timeline 可以继续追加内容，页面会保留完整文本，并在桌面端用左右交错时间线展示。

每个时间点必须手动填写 `level`，只接受 `dot`、`minor`、`mid`、`major`，例如：

```json
{
  "date": "2026-07-29",
  "title": "ICPC 沈阳邀请赛银牌",
  "level": "mid"
}
```

四级标题字号依次为 12、15、18、18px；`mid` 为黑色常规字重，`major` 为金色粗体。节点间距按实际文字高度计算，换行和窗口尺寸变化后自动更新。折叠仅隐藏对应层级的标签，保留位置，悬停或键盘聚焦仍可查看。

提交前可运行 `node scripts/validate-timeline.mjs` 检查类型。Pages 部署也会执行检查，缺失或无效的 `level` 会使构建失败。

## 更新友链

友链页内容在 `config/friends.json`。新增友链时追加站点名、链接、描述和头像地址；没有头像时页面会使用文字占位。

## 代码高亮

支持 `c`、`cpp`、`java`、`python`、`bash`。第三方前端库统一放在 `assets/vendor/`，代码高亮主题使用 `assets/vendor/highlight.js/11.11.1/styles/atom-one-dark.min.css`。

代码块请在围栏后写明语言；`text`、未声明语言或尚未支持的语言按纯文本展示，不再猜测语言。行号与代码按行布局，工具栏可以切换自动换行、复制代码，复制内容不含行号。公式由 Markdown 扩展识别，代码内的 `$`、尖括号和反斜杠不会被公式预处理改写。当前固定使用的 marked 4 会把制表符展开为四个空格。

渲染职责分为 `markdown-renderer.js`（Markdown / 公式识别）、`code-blocks.js`（高亮与代码交互）、`article-renderer.js`（文章、目录与 MathJax）。公式加载失败时保留正文和代码。

## 音乐播放器

`config/music.json` 继续维护原歌单、音量、顺序和循环模式。播放器使用原生 Audio；歌单仍通过原有 Meting API 获取，不再加载 APlayer / MetingJS 的隐藏界面。

- 默认点击播放才请求歌单，加载失败可重试；第三方服务或版权限制无法由静态站点保证，面板保留音乐平台入口。
- 点击封面或曲目信息打开面板，可搜索歌单、拖动进度、调整音量、切换顺序/循环和歌词；`Escape` 收起面板，右侧箭头最小化播放器。
- 记录当前歌曲、播放位置和设置；跨页面后点击播放恢复，不绑定全局点击事件强制启动声音。浏览器禁止自动播放时会提示再次点击。
- 兼容旧版 `tdk-music:<playlistId>` 设置。存储不可用时仍可播放；不在每个时间更新事件里写存储。
- 实现在 `music-player.js`，纯数据逻辑在 `music-model.js`，样式在 `music-player.css`。旧 vendor 文件保留以便回退，页面不再引用。

## 回归检查

Node.js 22，无需安装依赖即可运行：

```bash
npm test
npm run check
```

浏览器回归需额外安装 Playwright（仅开发测试使用，不是站点运行依赖）：

```bash
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

测试启动临时本地服务器和独立浏览器，使用隔离的存储、模拟歌单接口和本地静音 WAV，覆盖代码复制/换行、公式失败降级、播放器失败重试、切歌与恢复。截图写入系统临时目录，不读取或更改个人浏览器状态。也可用 `PLAYWRIGHT_MODULE` 和 `BROWSER_EXECUTABLE` 指定已有测试运行时。
