# TDK 的小窝

这是 thedyingkai_ 的个人静态博客，部署在 GitHub Pages。站点用于整理算法竞赛题解、数学/模板笔记、工程项目复盘和个人成长记录。

## 站点内容

- **文章归档**：Markdown 文章位于 `posts/`，文章页支持 LaTeX、目录、代码高亮、行号和复制按钮。
- **项目索引**：集中展示在线评测、训练工具、脚本自动化等长期项目。
- **关于页面**：记录 TDK 的竞赛经历、工程方向和阶段里程碑。
- **友链页面**：展示朋友站点，并预留头像位和交换信息。

## 技术结构

```text
.
├── index.html              # 首页
├── blog/                   # 文章列表与文章阅读页
├── posts/                  # Markdown 文章源文件
├── projects/               # 项目页
├── friends/                # 友链页
├── about/                  # 关于页
├── assets/                 # 站点脚本与样式
├── highlight/              # Highlight.js 完整版核心、语言与主题资源
└── site.config.json        # 项目、关于、友链等动态内容配置
```

## 文章格式

文章使用带 front matter 的 Markdown：

```markdown
---
title: 文章标题
description: 简短描述
date: 2026.06.24
tags: [算法, 笔记]
---

## 正文标题

这里写正文。
```

代码块建议标注语言：

````markdown
```cpp
void solve() {
    // ...
}
```
````

## 本地预览

在仓库根目录启动静态服务器：

```powershell
python -m http.server 8787 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:8787/
```

## 维护说明

- 新文章直接放入 `posts/`，文章列表会从 GitHub 仓库内容接口读取。
- 项目、关于页、友链页内容优先维护 `site.config.json`。
- 代码高亮使用 `highlight/highlight.js` 和 `highlight/languages/*.js` 的完整版资源，不使用压缩版入口。
- 站点是纯静态页面，不需要构建步骤。

## 个人标识

TDK 是 `thedyingkai_` 的简称。常用平台 ID 为 `thedyingkai`，主要活动方向是 XCPC、在线评测系统、训练工具和 Web 后端。
