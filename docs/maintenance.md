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
| Persistent shell / same-document navigation / page lifetimes | `site.js`, `navigation.js`, `navigation-history.js`, `page-runtime.js` |
| Page reveal/progress, decorative image motion | `page-effects.js`, `images.js` |

Only the about page imports timeline code. Shared config loads are deduplicated; explicit retries can reload corrected JSON. List pages read metadata instead of fetching every article body or mixing in GitHub's `main` branch.

Formula headings retain their original TeX. MathJax typesets the article and TOC together; overflow previews clone already-typeset content without extra math work on hover. The retired TexMe stylesheet was merged into `post-renderer.css`. Authored Markdown, including intentional HTML, is trusted repository content; this renderer is not an untrusted-user-content sanitizer.

CSS keeps the gradients, hover feedback, entrance effects and timeline sparks. Repeating shadow/filter repaints on every card/title were removed. Hero timers stop offscreen, in background tabs, on pause, or when reduced motion is enabled. Carousel controls are keyboard-accessible and outside the decorative images' `aria-hidden` subtree. Timeline labels retain manual levels and measured spacing.

## Browser regression

Install Playwright only for development, as described in the root README. Tests run a fresh isolated browser, a temporary HTTP server, mocked remote services and local silent audio; they never attach to a personal profile. Use `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` for an existing test runtime. Set `SITE_ROOT` to the absolute `_site/` path to test the deployment artifact instead of source files.

Coverage includes exact code copying, wrapping/line numbers, math fallback and retry, all five convolution headings in the TOC, tooltip bounds, mobile overflow, player loading/errors/seek/restore, denied storage, metadata-only listing, search/tags, 1/2/3-column layout and focus retention, partial legacy index recovery, cloud back/forward/invalid links/cyclic graphs, motion pause controls, and timeline spacing/level controls. Screenshots are written to a unique system-temporary directory.

External music sources can still fail due to upstream availability, licensing, CORS or browser autoplay rules. Failures remain actionable; tests cannot guarantee a third-party stream will remain available. Existing pinned vendor files are retained and are not automatically upgraded by this refactor.

## Continuous music during navigation

The header, footer, music dock and its native Audio instance live for the whole document. Normal same-origin links between supported site pages fetch HTML and replace only `main`; the player is neither detached nor recreated. Playback, buffering, lyrics, playlist/search, volume, progress, open panel and minimized state remain intact, including browser back/forward. These are real URLs: direct visits and refreshes still work on static hosting, without server rewrites.

Page entry modules export `mountPage({ root, signal, onCleanup })` instead of running on import. Keep queries inside `root`, guard asynchronous results with `signal`, and register observers/listeners/timers with `onCleanup`. Shared cached requests are not cancelled by one page's departure. Article requests are cancelled; MathJax work is serialized. The shell never evaluates scripts from fetched HTML. New page routes must be added to the navigation allowlist and, if they need code, to the lazy imports in `page-runtime.js`.

History state is namespaced. Pages adding entries (such as cloud folders) must use `savePageScroll` and `pushPageHistory`, preserving both scroll restoration and their own state. Failed or cancelled navigation keeps the current content and music, with an explicit retry instead of a forced document reload. Downloads, external links, modified clicks and new-tab targets retain normal browser behavior. Navigation only restores late layout positions if the user has not interacted in the meantime.

Continuity applies within the same open blog document. Refreshing, closing that tab or navigating it to another website destroys the document and cannot retain that Audio instance. Saved-track recovery remains available after a full reload, subject to browser autoplay rules. Third-party visit counters remain best-effort; cached displayed counts can be reused, but soft navigation does not re-run the counter script to fabricate a new page view.

`tests/navigation.browser.mjs` uses local silent WAV playback and probes media events: it asserts a single document and Audio instance, advancing time, no extra pause/load events, retained controls, route functionality, history, rapid navigation and failure recovery.
