export function initPageEffects() {
  const root = document.documentElement;
  const progress = document.querySelector('.progress');
  let frame = 0;
  let maximum = 0;
  const paintProgress = () => {
    frame = 0;
    if (progress) progress.style.transform = `scaleX(${maximum > 0 ? Math.min(1, Math.max(0, scrollY / maximum)) : 0})`;
  };
  const scheduleProgress = () => { if (!frame) frame = requestAnimationFrame(paintProgress); };
  const measure = () => { maximum = root.scrollHeight - root.clientHeight; scheduleProgress(); };
  new ResizeObserver(measure).observe(document.body);
  addEventListener('scroll', scheduleProgress, { passive: true });
  addEventListener('resize', measure, { passive: true });

  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      reveal.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  const ambient = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('motion-in-view', entry.isIntersecting));
  });
  const observed = new Set();
  const scan = () => {
    // Filter/search replaces cards. Release removed nodes instead of retaining
    // them until navigation, and share observers across all content updates.
    for (const node of observed) {
      if (node.isConnected) continue;
      reveal.unobserve(node); ambient.unobserve(node); observed.delete(node);
    }
    document.body.classList.add('motion-ready');
    document.querySelectorAll('.page-head, .section-head, .card, .stat-card, .anime-frame, .post-tools, .friend-exchange__panel, .friend-exchange__steps li, .band').forEach((node, index) => {
      if (observed.has(node)) return;
      observed.add(node);
      if (node.matches('.band')) ambient.observe(node);
      else {
        node.classList.add('reveal-item');
        node.style.setProperty('--reveal-delay', `${Math.min(index % 8, 7) * 45}ms`);
        reveal.observe(node);
      }
    });
    measure();
  };
  let scanFrame = 0;
  addEventListener('tdk:content-rendered', () => {
    if (!scanFrame) scanFrame = requestAnimationFrame(() => { scanFrame = 0; scan(); });
  });
  const visibility = () => root.classList.toggle('is-page-hidden', document.hidden);
  document.addEventListener('visibilitychange', visibility);
  visibility();
  scan();
}
