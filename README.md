# thedyingkai.github.io

一个参考 `xcpc rating` 轻奢竞赛年鉴风格写成的静态个人博客首版。

## 已完成

- 纯静态页面，无构建依赖，直接适配 GitHub Pages。
- 首页、文章列表、文章详情、项目页、关于页、404 页面。
- 冷调雪白纸面、深牛津蓝强调、衬线大标题、细线卡片、轻纸纹背景。
- 中文正文排版、代码块、标签、项目卡片、时间线。
- `robots.txt`、`sitemap.xml`、`favicon.svg`、`.nojekyll`。

## 部署方式

在仓库 Settings -> Pages 中选择：

- Source: Deploy from a branch
- Branch: main
- Folder: /root

之后访问：

```txt
https://thedyingkai.github.io/
```

## 后续迁移方向

当前首版为了直接可访问，采用纯静态文件。后续可以把当前视觉系统迁移到 Astro：

- `assets/site.css` -> `src/styles/global.css`
- `blog/*/index.html` -> `src/content/blog/*.md`
- 公共头部、页脚、文章卡片拆为 Astro 组件

这样既保留首版视觉，也能获得 Markdown 内容系统。
