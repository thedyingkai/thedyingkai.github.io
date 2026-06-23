# thedyingkai.github.io

个人博客新站。当前项目是纯静态页面，不需要本地构建步骤。

## 内容来源

```txt
site.config.json  -> 首页 / 关于 / 项目 / 导航 / 成长记录 / 项目卡片
posts/*.md        -> 文章正文
```

## 页面入口

```txt
index.html            首页，文章卡片由 posts/*.md 自动生成
blog/index.html       文章归档，文章卡片由 posts/*.md 自动生成
blog/post/index.html  文章详情页，根据 ?file=xxx.md 读取 posts/xxx.md
projects/index.html   项目页，读取 site.config.json
about/index.html      关于页，读取 site.config.json
```

## 有意义的脚本

```txt
assets/post-list.js        首页和文章归档的文章卡片渲染器
assets/article-renderer.js 文章详情页渲染器：读取 Markdown，交给 TexMe 渲染，再交给 MathJax 排版公式
assets/runtime-config.js   关于页和项目页的配置渲染器
assets/site.js             通用页面交互
```

## 有意义的样式

```txt
assets/site.css          全站主题样式
assets/post-renderer.css 文章页外层布局和通用 Markdown 样式
assets/texme-render.css  TexMe / MathJax / 代码块输出样式
```

## 写文章

直接在 `posts/` 下新建 Markdown 文件：

```txt
posts/my-note.md
```

不写 frontmatter 也可以，页面会从文件名和正文一级标题推断标题。

需要手动覆盖时，在文件开头加：

```md
---
title: 文章标题
description: 一句话简介
date: 2026.06.23
tags: [XCPC, 题解, 笔记]
---
```

以下划线开头的文件不会进入文章列表。

## 渲染说明

文章详情页不再使用自写 Markdown 渲染器。

```txt
Markdown  -> TexMe
LaTeX     -> MathJax
代码高亮  -> highlight.js
```

项目中已经移除旧的 `build.mjs`、`package.json`、`runtime-blog.js`、`render-fix.css` 和测试脚本。

## GitHub Pages

当前通过 GitHub Pages 静态发布仓库根目录。
