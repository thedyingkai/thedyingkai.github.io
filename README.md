# thedyingkai.github.io

个人博客新站。页面内容不再写死在 HTML 里：

```txt
site.config.json  -> 首页 / 关于 / 项目 / 导航 / 统计 / 卡片
posts/*.md        -> 文章正文
build.mjs         -> 生成 index.html、about/、projects/、blog/
```

## 改首页、关于、项目

只改 `site.config.json`。

常用字段：

```txt
site      站点标题、描述、品牌名
nav       顶部导航
home      首页 hero、按钮、统计卡片
about     关于页简介、成长记录卡片
projects  项目页项目卡片、项目方向
```

## 写文章

直接在 `posts/` 下新建 Markdown 文件：

```txt
posts/my-note.md
```

不写 frontmatter 也可以，构建器会自动从文件名和正文一级标题推断标题，并给出默认简介和标签。

需要手动覆盖时，在文件开头加：

```md
---
title: 文章标题
description: 一句话简介
date: 2026.06.23
tags: [XCPC, 题解, 笔记]
---
```

以下划线开头的文件不会生成文章页。

## 支持内容

- Markdown
- LaTeX 行内公式和块级公式
- 代码块卡片样式
- 自动生成 `/blog/<文件名>/`
- 自动生成 `/blog/` 文章归档
- 自动生成首页、关于页、项目页

## 本地构建

```bash
npm install
npm run build
```

## GitHub Pages

仓库包含 GitHub Actions 工作流，会在推送 `main` 时执行构建并部署 Pages。
