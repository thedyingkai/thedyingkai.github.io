import { escapeHtml as cfgEsc } from './lib/dom.js?v=1.0';
import { TIMELINE_LEVEL_RANK, timelineEntries } from './timeline-model.js?v=1.0';

const TIMELINE_VIEW_STEPS = [
  { minRank: 0, label: '全部' },
  { minRank: 1, label: '次要以上' },
  { minRank: 2, label: '主要以上' },
  { minRank: 3, label: '最大层' }
];
const timelineCleanups = new WeakMap();

function timelineWave(t) {
  const main = Math.sin((t * 4.18 - 0.18) * Math.PI);
  const fine = Math.sin((t * 9.4 + 0.2) * Math.PI) * 0.12;
  return Math.max(12, Math.min(88, 50 + (main + fine) * 31));
}

function timelinePath(points) {
  if (!points.length) return '';
  const position = point => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  const slope = index => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    return after.y === before.y ? 0 : (after.x - before.x) / (after.y - before.y);
  };
  return points.slice(1).reduce((path, point, i) => {
    const previous = points[i];
    const dy = (point.y - previous.y) / 3;
    const start = { x: previous.x + slope(i) * dy, y: previous.y + dy };
    const end = { x: point.x - slope(i + 1) * dy, y: point.y - dy };
    return `${path} C${position(start)} ${position(end)} ${position(point)}`;
  }, `M${position(points[0])}`);
}

function timelineItem(entry, index = 0, items = []) {
  const { data, level } = entry;
  const x = timelineWave(items.length <= 1 ? 0.5 : index / (items.length - 1));
  const side = x < 50 ? 'right' : 'left';
  const style = `--timeline-x:${x.toFixed(2)}%;--timeline-phase:${-(index % 5)}s`;
  return `<div class="timeline__item timeline__item--${level} timeline__item--${side}" style="${style}" tabindex="0" aria-label="${cfgEsc(`${data.date} ${data.title}`)}"><span class="timeline__halo" aria-hidden="true"></span><span class="timeline__dot" aria-hidden="true"></span><span class="timeline__text"><span class="timeline__time">${cfgEsc(data.date)}</span><h3>${cfgEsc(data.title)}</h3></span></div>`;
}

function timelineHtml(entries = []) {
  return `<svg class="timeline__curve" aria-hidden="true"><path class="timeline__curve-shadow"></path><path class="timeline__curve-main"></path><path class="timeline__curve-gold"></path></svg><span class="timeline__spark" aria-hidden="true"></span><span class="timeline__spark timeline__spark--gold" aria-hidden="true"></span>${entries.map(timelineItem).join('')}`;
}

function initTimelineLayout(timeline) {
  const nodes = [...timeline.querySelectorAll('.timeline__item')];
  const labels = nodes.map(node => node.querySelector('.timeline__text'));
  const svg = timeline.querySelector('.timeline__curve');
  const paths = [...svg.querySelectorAll('path')];
  const sparks = [...timeline.querySelectorAll('.timeline__spark')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const visibleNodes = new Set();
  let animations = [];
  let keyframes = [];
  let frame = 0;
  let width = 0;
  let active = true;

  const syncMotion = () => {
    const running = !document.hidden && !motion.matches && visibleNodes.size > 0;
    timeline.classList.toggle('timeline--running', running);
    animations.forEach(animation => running ? animation.play() : animation.pause());
  };

  const updateSparks = () => {
    animations.forEach(animation => animation.cancel());
    animations = [];
    if (!motion.matches && keyframes.length && typeof sparks[0]?.animate === 'function') {
      animations = sparks.map((spark, index) => {
        const animation = spark.animate(keyframes, {
          duration: 18000,
          iterations: Infinity,
          easing: 'linear'
        });
        animation.currentTime = index * 9000;
        return animation;
      });
    }
    syncMotion();
  };

  const layout = () => {
    frame = 0;
    if (!active || !timeline.isConnected) return;
    width = timeline.clientWidth;
    if (!width) return;
    const gap = parseFloat(getComputedStyle(timeline).getPropertyValue('--timeline-gap')) || 24;
    const points = nodes.map((node, index) => {
      const x = timelineWave(nodes.length <= 1 ? 0.5 : index / (nodes.length - 1)) * width / 100;
      // Labels face inward; reserve room for the dot, its halo and the outer edge.
      const available = (x < width / 2 ? width - x : x) - 36;
      node.style.setProperty('--label-max-width', `${Math.max(1, available)}px`);
      return { x, y: 0 };
    });
    // Read all actual line heights together, then write positions in one batch.
    const heights = labels.map(label => Math.ceil(label.getBoundingClientRect().height));
    let bottom = 24;
    points.forEach((point, index) => {
      const height = Math.max(heights[index], 32);
      point.y = bottom + height / 2;
      bottom += height + gap;
    });
    const height = Math.max(80, bottom - gap + 24);
    timeline.style.height = `${height}px`;
    nodes.forEach((node, index) => node.style.setProperty('--timeline-y', `${points[index].y}px`));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const path = timelinePath(points);
    paths.forEach(node => node.setAttribute('d', path));

    // Sample the static path only on layout. The moving lights animate transforms,
    // avoiding a full-height SVG stroke repaint on every animation frame.
    keyframes = [];
    if (points.length > 1) {
      const length = paths[1].getTotalLength();
      const samples = Math.max(60, Math.min(220, Math.ceil(length / 24)));
      keyframes = Array.from({ length: samples + 1 }, (_, index) => {
        const offset = index / samples;
        const point = paths[1].getPointAtLength(length * offset);
        return { transform: `translate(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px)`, opacity: index === 0 || index === samples ? 0 : 1, offset };
      });
    }
    timeline.classList.add('timeline--ready');
    updateSparks();
  };

  const scheduleLayout = () => {
    if (active && !frame) frame = requestAnimationFrame(layout);
  };
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(changes => {
    if (changes.some(change => change.target !== timeline || Math.abs(change.contentRect.width - width) > 1)) scheduleLayout();
  }) : null;
  resizeObserver?.observe(timeline);
  labels.forEach(label => resizeObserver?.observe(label));
  window.addEventListener('resize', scheduleLayout, { passive: true });
  document.fonts?.ready.then(scheduleLayout);

  const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(changes => {
    changes.forEach(change => {
      change.target.classList.toggle('timeline__item--in-view', change.isIntersecting);
      if (change.isIntersecting) visibleNodes.add(change.target);
      else visibleNodes.delete(change.target);
    });
    syncMotion();
  }) : null;
  nodes.forEach(node => visibilityObserver?.observe(node));
  document.addEventListener('visibilitychange', syncMotion);
  motion.addEventListener('change', updateSparks);
  scheduleLayout();

  return () => {
    active = false;
    cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    animations.forEach(animation => animation.cancel());
    window.removeEventListener('resize', scheduleLayout);
    document.removeEventListener('visibilitychange', syncMotion);
    motion.removeEventListener('change', updateSparks);
  };
}

function timelineButton(label, ariaLabel) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'timeline-controls__button';
  button.textContent = label;
  button.setAttribute('aria-label', ariaLabel);
  button.title = ariaLabel;
  return button;
}

function timelineControls(timeline) {
  const head = timeline.closest('section')?.querySelector('.section-head');
  let controls = head?.querySelector('[data-about-timeline-controls]');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'timeline-controls';
    controls.dataset.aboutTimelineControls = '';
    if (head) head.append(controls);
    else timeline.before(controls);
  }

  const collapse = timelineButton('-', '折叠一层');
  const status = document.createElement('span');
  status.className = 'timeline-controls__status';
  status.setAttribute('aria-live', 'polite');
  const expand = timelineButton('+', '展开一层');
  controls.replaceChildren(collapse, status, expand);
  return { collapse, status, expand };
}

export function renderTimeline(timeline, items = []) {
  const entries = timelineEntries(items);
  timelineCleanups.get(timeline)?.();
  timeline.classList.remove('timeline--ready', 'timeline--running');
  const controls = timelineControls(timeline);
  let stepIndex = 0;
  timeline.innerHTML = timelineHtml(entries);
  timelineCleanups.set(timeline, initTimelineLayout(timeline));

  const update = () => {
    const step = TIMELINE_VIEW_STEPS[stepIndex] || TIMELINE_VIEW_STEPS[0];
    const visibleLabels = entries.filter(entry => TIMELINE_LEVEL_RANK[entry.level] >= step.minRank).length;
    timeline.dataset.labelMinRank = String(step.minRank);
    controls.status.textContent = `${step.label} · ${visibleLabels}/${entries.length}`;
    controls.collapse.disabled = stepIndex >= TIMELINE_VIEW_STEPS.length - 1;
    controls.expand.disabled = stepIndex <= 0;
  };

  const changeStep = delta => {
    const next = Math.max(0, Math.min(TIMELINE_VIEW_STEPS.length - 1, stepIndex + delta));
    if (next === stepIndex) return;
    stepIndex = next;
    update();
  };

  controls.collapse.addEventListener('click', () => changeStep(1));
  controls.expand.addEventListener('click', () => changeStep(-1));
  update();
}
