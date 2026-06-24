# TDK 的小窝

这是 thedyingkai_ 的个人静态博客，部署在 GitHub Pages。站点主要用于整理算法竞赛题解、数学与模板笔记、项目复盘和成长记录。

## 目录

```text
.
├── index.html              # 首页
├── blog/                   # 文章列表与文章阅读页
├── posts/                  # Markdown 文章源文件
├── projects/               # 项目页
├── cloud/                  # 云盘入口
├── friends/                # 友链页
├── about/                  # 关于页
├── assets/                 # 站点脚本、样式和图片
├── config/                 # 页面内容配置
├── highlight/              # 站内代码高亮资源
├── scripts/                # 自动生成 RSS、sitemap、文章清单
├── rss.xml                 # RSS 输出
└── sitemap.xml             # 搜索引擎站点地图
```

`.nojekyll` 用来关闭 GitHub Pages 的 Jekyll 处理，保证 `posts/*.md` 可以作为原始 Markdown 被前端读取。

## 本地预览

```powershell
python -m http.server 8787 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:8787/
```

如果新增或删除了文章，先运行：

```powershell
node scripts/generate-site-data.mjs
```

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

## 正文标题

这里写正文。
```

文章封面默认不显示。需要封面时，在 front matter 里额外写：

```markdown
cover: 1.jpg
coverAlt: 图片描述
```

封面文件从 `assets/images/anime/` 读取，也可以写完整 URL。代码块建议标注语言：

````markdown
```cpp
void solve() {
    // ...
}
```
````

线上部署时，GitHub Actions 会自动运行 `scripts/generate-site-data.mjs`，生成 `config/posts.json`、`rss.xml` 和 `sitemap.xml`。也就是说，正常更新文章只需要提交 `posts/*.md`；本地预览时才需要手动运行生成脚本。

## 更新图片

二次元图片统一放在 `assets/images/anime/`。

当前约定：

```json
"aboutProfile": { "src": "0.jpg" },
"homeHero": { "images": [{ "src": "1.jpg" }, { "src": "2.jpg" }] }
```

`0.jpg` 用于 About 页头像图；首页底层叠放图由 `config/images.json` 的 `homeHero.images` 控制。想加更多首页图片时，把图片放进 `assets/images/anime/`，再追加：

```json
{
  "src": "3.jpg",
  "alt": "图片描述"
}
```

## 更新项目

项目页内容在 `config/projects.json`。新增项目时追加一个对象，常用字段包括 `title`、`meta`、`text`、`href`、`tags`。页面会自动按配置渲染卡片。

## 更新云盘

云盘页内容在 `config/cloud.json`。目录使用 `children` 表示，文件优先使用 `downloadUrl` 或 `href`；如果只写 `path`，页面会自动拼接到 `dl.thedyingkai.cn`。

## 更新关于页

关于页内容在 `config/about.json`，包括个人简介、链接、卡片和 Timeline。Timeline 可以继续追加内容，页面会保留完整文本，并在桌面端用左右交错时间线展示。

## 更新友链

友链页内容在 `config/friends.json`。新增友链时追加站点名、链接、描述和头像地址；没有头像时页面会使用文字占位。

## 更新 RSS 和 Sitemap

RSS 与 sitemap 由 `scripts/generate-site-data.mjs` 自动生成：

```powershell
node scripts/generate-site-data.mjs
```

GitHub Pages 工作流会在每次部署前运行该脚本，所以线上一般不需要手动维护 `rss.xml`、`sitemap.xml` 和 `config/posts.json`。

## 代码高亮

站内使用 Highlight.js 完整版核心 `highlight/highlight.js`，并保留 `c`、`cpp`、`java`、`python`、`bash` 的完整版语言文件。主题使用 `highlight/styles/atom-one-dark.css`。压缩版入口和未使用主题不参与页面加载。
