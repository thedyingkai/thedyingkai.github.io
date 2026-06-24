# Anime Images

Content images for `config/images.json` live here.

Current usage:

```json
"aboutProfile": { "src": "0.jpg" },
"homeHero": { "images": [{ "src": "1.jpg" }, { "src": "2.jpg" }] }
```

Add more homepage images by appending items to `config/images.json`:

```json
{
  "src": "3.jpg",
  "alt": "图片描述"
}
```

Article covers are optional and default to no cover. Add a cover in a post's front matter:

```md
---
title: Example
cover: 1.jpg
coverAlt: 图片描述
---
```
