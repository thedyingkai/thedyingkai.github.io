# thedyingkai.github.io

个人博客新站。正文内容由 `posts/*.md` 驱动，构建脚本会自动生成文章页。

## 写文章

最省事的用法：直接在 `posts/` 下新建 Markdown 文件。

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

可直接复制 `posts/_example.md` 作为模板；以下划线开头的文件不会生成文章页。

## 支持内容

- Markdown
- LaTeX 行内公式和块级公式
- 代码块卡片样式
- 自动生成 `/blog/<文件名>/`
- 自动生成 `/blog/` 文章归档

## 本地预览

```bash
npm install
npm run build
```

然后打开生成后的页面即可。

## GitHub Pages

仓库包含 GitHub Actions 工作流，会在推送 `main` 时执行构建并部署 Pages。
