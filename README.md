# thedyingkai.github.io

一个参考 `xcpc rating` 轻奢竞赛年鉴风格的 Astro 静态个人博客首版。

## 设计方向

- 冷调雪白纸面背景
- 深牛津蓝作为唯一主强调色
- 宋体/衬线大标题 + 无衬线正文
- 极细边线、低存在感阴影、轻纸纹
- 首页偏个人年鉴/项目索引，不做传统博客模板感
- 文章页重点优化中文阅读和代码块

## 本地启动

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## 部署到 GitHub Pages

仓库 Settings -> Pages 里选择 GitHub Actions，之后每次推送 main 分支会自动部署。

## 写文章

在 `src/content/blog/` 下面新增 Markdown 文件：

```md
---
title: "文章标题"
description: "文章简介"
pubDate: 2026-06-23
tags: ["tag"]
---

正文内容
```

## 后续可扩展

- Pagefind 全文搜索
- 标签页、分类页、归档页
- RSS / sitemap
- Giscus 评论
- 题解专用模板
- 项目页细分
- 深浅色主题切换
