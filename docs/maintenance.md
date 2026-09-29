# Maintenance and refactor notes

This remains a dependency-free static site. Content lives in `posts/` and `config/`; there is no SPA framework, server, or new runtime package to maintain.

## Local workflow

Use Node.js 22. After editing Markdown or asset versions:

```sh
npm run generate
node scripts/sync-asset-versions.mjs
npm test
npm run check
npm run build
```

`generate` writes `config/posts.json`, `rss.xml`, and `sitemap.xml`. The metadata index is version 2, while the browser still understands the old filename-only format. All three outputs are deterministic: rebuilding unchanged posts does not change publication dates. Front matter supports scalar strings and inline string arrays, not general YAML. Prefix draft filenames with `_` to keep them out of the index and build output.

`check` validates first-party JavaScript syntax, config structure, timeline levels/dates, the cloud directory graph, local asset/module references, generated content, and cache versions. Local checks do not depend on third-party availability.

`build` only replaces the generated `_site/` directory. It refuses symlinks and copies a public-file allowlist, leaving out tests, scripts, documentation, dependencies, and repository metadata. Preview `_site/` with any static HTTP server. The Pages workflow remains manual and uploads `_site/`; the `check` workflow verifies pushes and pull requests without deploying.

## Module responsibilities

| Area | Implementation |
| --- | --- |
| HTTP, config deduplication/retry, URL policies, DOM, clipboard | `assets/lib/` |
| Shared front matter and date parsing | `assets/lib/posts.js` |
| Article index / cards / filters / responsive masonry | `post-store.js`, `post-list.js` |
| Markdown, code, MathJax, mathematical TOC | `markdown-renderer.js`, `code-blocks.js`, `article-math.js`, `article-toc.js`, `article-renderer.js` |
| Native Audio playback / persistence / playlist data | `music-player.js`, `music-model.js` |
| Timeline data rules / layout and animation | `timeline-model.js`, `timeline.js` |
| Cloud directory validation / navigation and downloads | `cloud-model.js`, `cloud.js` |
| Navigation, page reveal/progress, decorative image motion | `site.js`, `page-effects.js`, `images.js` |

Only the about page imports timeline code. Shared config loads are deduplicated; explicit retries can reload corrected JSON. List pages read metadata instead of fetching every article body or mixing in GitHub's `main` branch.

Formula headings retain their original TeX. MathJax typesets the article and TOC together; overflow previews clone already-typeset content without extra math work on hover. The retired TexMe stylesheet was merged into `post-renderer.css`. Authored Markdown, including intentional HTML, is trusted repository content; this renderer is not an untrusted-user-content sanitizer.

CSS keeps the gradients, hover feedback, entrance effects and timeline sparks. Repeating shadow/filter repaints on every card/title were removed. Hero timers stop offscreen, in background tabs, on pause, or when reduced motion is enabled. Carousel controls are keyboard-accessible and outside the decorative images' `aria-hidden` subtree. Timeline labels retain manual levels and measured spacing.

## Browser regression

Install Playwright only for development, as described in the root README. Tests run a fresh isolated browser, a temporary HTTP server, mocked remote services and local silent audio; they never attach to a personal profile. Use `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` for an existing test runtime. Set `SITE_ROOT` to the absolute `_site/` path to test the deployment artifact instead of source files.

Coverage includes exact code copying, wrapping/line numbers, math fallback and retry, all five convolution headings in the TOC, tooltip bounds, mobile overflow, player loading/errors/seek/restore, denied storage, metadata-only listing, search/tags, 1/2/3-column layout and focus retention, partial legacy index recovery, cloud back/forward/invalid links/cyclic graphs, motion pause controls, and timeline spacing/level controls. Screenshots are written to a unique system-temporary directory.

External music sources can still fail due to upstream availability, licensing, CORS or browser autoplay rules. Failures remain actionable; tests cannot guarantee a third-party stream will remain available. Existing pinned vendor files are retained and are not automatically upgraded by this refactor.
