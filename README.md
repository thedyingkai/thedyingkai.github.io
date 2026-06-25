# TDK 的小窝

这是 thedyingkai_ 的个人静态博客，部署在 GitHub Pages。站点主要用于整理算法竞赛题解、数学与模板笔记、项目复盘和成长记录。

## 交换友链

你可以这样在你的网站填写我的友链：
|项目|值|
|-----|-----|
|站点名称|TDK 的小窝|
|站点 URL|https://thedyingkai.github.io|
|头像 URL|https://thedyingkai.github.io/assets/images/site/ico.png|
|RSS URL|https://thedyingkai.github.io/rss.xml|
|描述|华风夏韵，洛水天依。|

你可以这样将你的友链填写到我的网站：

1.  点击 GitHub 仓库右上角的 Fork 按钮，这会把整个项目复制一份到你自己的 GitHub 账号下。

2. 打开你电脑的终端 (或 Git Bash)，输入下面的命令，把你的项目副本下载到本地。

```bash
# 把 "YourGitHubID" 换成你的 GitHub 用户名
git clone https://github.com/YourGitHubID/thedyingkai.github.io
.git

# 进入项目文件夹
cd thedyingkai.github.io
```

3.  新建一个分支。

```bash
# 分支名可以自定义，比如 add-my-name
git checkout -b add-my-name
```

4.  找到友链文件 `config/friends.json`，用你常用的文本编辑器 (比如 VS Code) 打开它。

5.  在文件的 `"links":` 内部，找到最后一个 `}`，加上你的信息。格式如下：

```json
"links": [
    {
      "meta": "Friend",
      "title": "站点名称",
      "text": "描述",
      "href": "站点 URL",
      "tags": [
        "Blog"
      ]
    },
    {
        ... // 新的友链，注意前面的 } 后需要加一个 ,
    }
  ],
```

6.  保存文件。然后回到终端，用 `git add` 命令告诉 Git 你修改了这个文件：

```bash
git add config/friends.json
```

7.  提交你的修改，把你的修改推送到 GitHub 上的个人副本，并写一条说明（即引号内容），告诉别人你做了什么：

```bash
git commit -m "friends: add my blog link"
# "add-my-name" 是你刚刚创建的分支名
git push origin add-my-name
```

8.  回到你在 GitHub 上的项目副本页面 (`https://github.com/YourGitHubID/thedyingkai.github.io`)，页面上会出现一个黄色的提示，旁边有一个绿色的 Compare & pull request 按钮，点击它。然后在新页面检查一下信息，然后点击 Create pull request 按钮。

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
