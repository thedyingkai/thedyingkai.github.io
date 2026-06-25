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

本地 CSS/JS 的缓存版本统一维护在 `config/asset-versions.json`。修改 `assets/` 或 `highlight/` 下的样式、脚本后，只需要在这个文件里提升对应资源的版本号，然后运行：

```bash
node scripts/sync-asset-versions.mjs
```

这个脚本会把所有 HTML 里的 `?v=` 自动同步到版本清单。只想检查是否同步时运行：

```bash
node scripts/sync-asset-versions.mjs --check
```

GitHub Pages 部署流程也会运行同步脚本，确保线上构建使用同一份版本清单。

## 更新项目

项目页内容在 `config/projects.json`。新增项目时追加一个对象，常用字段包括 `title`、`meta`、`text`、`href`、`tags`。页面会自动按配置渲染卡片。

## 更新云盘

云盘页内容在 `config/cloud.json`。目录使用 `children` 表示，文件优先使用 `downloadUrl` 或 `href`；如果只写 `path`，页面会自动拼接到 `dl.thedyingkai.cn`。

## 更新关于页

关于页内容在 `config/about.json`，包括个人简介、链接、卡片和 Timeline。Timeline 可以继续追加内容，页面会保留完整文本，并在桌面端用左右交错时间线展示。

## 更新友链

友链页内容在 `config/friends.json`。新增友链时追加站点名、链接、描述和头像地址；没有头像时页面会使用文字占位。

## 代码高亮

支持 `c`、`cpp`、`java`、`python`、`bash`。主题使用 `highlight/styles/atom-one-dark.css`。
