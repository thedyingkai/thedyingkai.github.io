// One lifecycle for expensive visual work: viewport, background tabs and the
// user's live reduced-motion preference all gate timers / animation frames.
export function observeActivity(target, callback) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let previous;
  const sync = () => {
    const active = visible && !document.hidden && !reduced.matches;
    if (active !== previous) { previous = active; callback(active); }
  };
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  });
  observer.observe(target);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();
  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    callback(false);
  };
}
