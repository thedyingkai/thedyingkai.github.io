import { escapeHtml as esc, element as el, contentRendered } from './lib/dom.js?v=1.0';
import { imageUrl as resolveSrc } from './lib/urls.js?v=1.0';
import { loadConfig } from './lib/http.js?v=1.0';
import { observeActivity } from './lib/activity.js?v=1.0';

function imageItems(slot) {
  if (Array.isArray(slot.images)) return slot.images;
  return slot.src ? [slot] : [];
}

function frame(slot, basePath) {
  const src = resolveSrc(slot.src, basePath);
  if (!src) return '';
  const media = `<img src="${esc(src)}" alt="${esc(slot.alt || '')}" loading="lazy">`;
  return `<figure class="anime-frame${src ? ' has-image' : ' is-empty'}">${media}<figcaption><span>${esc(slot.title || '')}</span><small>${esc(slot.caption || '')}</small></figcaption></figure>`;
}

function stackStyle(item, index) {
  const patterns = [
    { x: 72, y: 55, width: 42, rotate: 5, opacity: .52, ratio: '13 / 20' },
    { x: 35, y: 61, width: 33, rotate: -9, opacity: .34, ratio: '1 / 1' },
    { x: 84, y: 45, width: 31, rotate: 11, opacity: .3, ratio: '4 / 5' },
    { x: 18, y: 67, width: 25, rotate: -13, opacity: .22, ratio: '3 / 4' }
  ];
  const p = patterns[index % patterns.length];
  const drift = Math.floor(index / patterns.length) * 7;
  const x = Number.isFinite(item.x) ? item.x : Math.max(8, Math.min(82, p.x + (index % 2 ? -drift : drift)));
  const y = Number.isFinite(item.y) ? item.y : Math.max(4, Math.min(58, p.y + drift));
  const width = Number.isFinite(item.width) ? item.width : Math.max(18, p.width - Math.floor(index / 3) * 4);
  const rotate = Number.isFinite(item.rotate) ? item.rotate : p.rotate;
  const opacity = Number.isFinite(item.opacity) ? item.opacity : p.opacity;
  const ratio = /^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/.test(item.ratio) ? item.ratio : p.ratio;

  const depth = Math.max(.38, 1 - index * .16);
  return `--stack-x:${x}%;--stack-y:${y}%;--stack-width:${width}%;--stack-rotate:${rotate}deg;--stack-opacity:${opacity};--stack-ratio:${esc(ratio)};--stack-z:${10 - index};--stack-depth:${depth}`;
}

function imageStack(slot, basePath) {
  const items = imageItems(slot).filter(item => resolveSrc(item.src, basePath));
  const images = items.map((item, index) => {
    const src = resolveSrc(item.src, basePath);
    if (!src) return '';
    return `<img class="hero__stack-image" data-stack-index="${index}" style="${stackStyle(item, index)}" src="${esc(src)}" alt="${esc(item.alt || '')}" loading="${index === 0 ? 'eager' : 'lazy'}">`;
  }).join('');
  return images;
}

function carouselOffset(index, active, total) {
  let offset = index - active;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function carouselStyle(offset) {
  if (offset === 0) return { x: 72, y: 55, width: 44, rotate: 5, opacity: .58, z: 18, depth: 1 };
  if (offset === -1) return { x: 36, y: 62, width: 34, rotate: -10, opacity: .36, z: 11, depth: .8 };
  if (offset === 1) return { x: 86, y: 44, width: 32, rotate: 11, opacity: .34, z: 10, depth: .76 };

  const side = offset < 0 ? -1 : 1;
  const magnitude = Math.min(3, Math.abs(offset));
  return {
    x: side < 0 ? 24 : 94,
    y: 50 + magnitude * 4,
    width: Math.max(18, 26 - magnitude * 2),
    rotate: side * (10 + magnitude * 4),
    opacity: Math.max(.04, .14 - magnitude * .04),
    z: 5 - magnitude,
    depth: Math.max(.4, .64 - magnitude * .08)
  };
}

function applyCarousel(images, activeIndex) {
  const total = images.length;
  images.forEach((image, index) => {
    const style = carouselStyle(carouselOffset(index, activeIndex, total));
    image.style.setProperty('--stack-x', `${style.x}%`);
    image.style.setProperty('--stack-y', `${style.y}%`);
    image.style.setProperty('--stack-width', `${style.width}%`);
    image.style.setProperty('--stack-rotate', `${style.rotate}deg`);
    image.style.setProperty('--stack-opacity', style.opacity);
    image.style.setProperty('--stack-z', style.z);
    image.style.setProperty('--stack-depth', style.depth);
    image.classList.toggle('is-active', index === activeIndex);
  });
}

function bindHeroStackMotion(target) {
  const host = target.closest('.hero__copy') || target;
  const images = [...target.querySelectorAll('.hero__stack-image')];
  if (!images.length) return;
  const controls = el('div', 'hero__stack-dots');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', '首页图片轮播');
  const dots = images.map((_, index) => {
    const dot = el('button', 'hero__stack-dot');
    dot.type = 'button';
    dot.setAttribute('aria-label', `切换到第 ${index + 1} 张图片`);
    dot.onclick = () => setActive(index);
    controls.append(dot);
    return dot;
  });
  const pause = el('button', 'hero__stack-pause', '暂停');
  pause.type = 'button';
  pause.setAttribute('aria-label', '暂停图片轮播');
  controls.append(pause);
  // Controls must not live under the decorative stack's aria-hidden/pointer-events.
  host.append(controls);
  let activeIndex = 0;
  let running = false;
  let paused = false;
  let hovering = false;
  let focused = false;
  let frame = 0;
  let cycle = 0;
  let x = 0, y = 0, nextX = 0, nextY = 0, hoverMix = 0;
  let depths = [];

  function setActive(index) {
    activeIndex = (index + images.length) % images.length;
    applyCarousel(images, activeIndex);
    depths = images.map(image => Number(image.style.getPropertyValue('--stack-depth')) || 1);
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === activeIndex);
      dot.setAttribute('aria-pressed', String(i === activeIndex));
    });
  }
  function setMotion(now) {
    target.style.setProperty('--tilt-x', `${(-y * 18).toFixed(2)}deg`);
    target.style.setProperty('--tilt-y', `${(x * 22).toFixed(2)}deg`);
    images.forEach((image, index) => {
      const depth = depths[index];
      const phase = index % 2 ? -1 : 1;
      const breath = (Math.sin(now / 1450 + index * .65) + 1) / 2;
      const lift = (.012 + breath * .018) * (1 - hoverMix) + .05 * hoverMix;
      image.style.setProperty('--image-x', `${(x * (18 + index * 3) * depth + phase * y * 3).toFixed(2)}px`);
      image.style.setProperty('--image-y', `${(y * (14 + index * 3) * depth + phase * x * 2).toFixed(2)}px`);
      image.style.setProperty('--image-scale', (1 + lift * depth).toFixed(3));
    });
  }
  function tick(now) {
    if (!running || paused) { frame = 0; return; }
    if (!hovering) {
      nextX = Math.sin(now / 2100) * .12 + Math.cos(now / 3600) * .08;
      nextY = Math.cos(now / 2600) * .1 + Math.sin(now / 3300) * .06;
    }
    hoverMix += ((hovering ? 1 : 0) - hoverMix) * .12;
    x += (nextX - x) * .095;
    y += (nextY - y) * .095;
    setMotion(now);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    clearInterval(cycle);
    cycle = 0;
    const animate = running && !paused;
    target.dataset.motionActive = String(animate);
    if (!animate) { cancelAnimationFrame(frame); frame = 0; }
    else {
      if (!frame) frame = requestAnimationFrame(tick);
      if (images.length > 1 && !hovering && !focused) cycle = setInterval(() => setActive(activeIndex + 1), 4800);
    }
  }
  pause.onclick = () => {
    paused = !paused;
    pause.textContent = paused ? '继续' : '暂停';
    pause.setAttribute('aria-label', paused ? '继续图片轮播' : '暂停图片轮播');
    pause.setAttribute('aria-pressed', String(paused));
    sync();
  };
  host.addEventListener('pointerenter', () => { hovering = true; sync(); });
  host.addEventListener('pointermove', event => {
    if (!running || paused || event.pointerType === 'touch') return;
    const rect = host.getBoundingClientRect();
    nextX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    nextY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
  });
  host.addEventListener('pointerleave', () => { hovering = false; sync(); });
  host.addEventListener('focusin', () => { focused = true; sync(); });
  host.addEventListener('focusout', event => { focused = host.contains(event.relatedTarget); sync(); });
  setActive(0);
  observeActivity(host, active => { running = active; sync(); });
}

loadConfig('images').then(cfg => {
  document.querySelectorAll('[data-image-slot]').forEach(target => {
    const slot = cfg.slots?.[target.dataset.imageSlot];
    if (!slot) return;
    target.innerHTML = frame(slot, cfg.basePath);
  });
  document.querySelectorAll('[data-image-stack]').forEach(target => {
    const slot = cfg.slots?.[target.dataset.imageStack];
    if (!slot) return;
    target.innerHTML = imageStack(slot, cfg.basePath);
    bindHeroStackMotion(target);
  });
  contentRendered();
}).catch(() => { });
