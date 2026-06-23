# thedyingkai.github.io

一个参考 `xcpc rating` 轻奢竞赛年鉴风格写成的静态个人博客首版。

## 已完成

- 纯静态页面，无构建依赖，直接适配 GitHub Pages。
- 首页、文章列表、文章详情、关于页。
- 冷调雪白纸面、深牛津蓝强调、衬线大标题、细线卡片、轻纸纹背景。
- 中文正文排版、代码块、标签、项目卡片、时间线。

## 部署方式

在仓库 Settings -> Pages 中选择：

- Source: Deploy from a branch
- Branch: main
- Folder: /root

之后访问：

```txt
https://thedyingkai.github.io/
```

## 修改文章

现在是纯静态首版，文章页面在 `blog/` 目录下。后续如果要扩展成 Astro 内容系统，可以把当前视觉系统整体迁移到 `src/`。
