(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function resolveSrc(src, basePath) {
    const raw = String(src || '').trim();
    if (!raw) return '';
    if (/^(?:https?:)?\/\//.test(raw) || raw.startsWith('/')) return raw;
    return `${basePath || ''}${raw}`;
  }

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
      { x: 68, y: 56, width: 39, rotate: 5, opacity: .48, ratio: '13 / 20' },
      { x: 28, y: 58, width: 32, rotate: -9, opacity: .34, ratio: '1 / 1' },
      { x: 52, y: 43, width: 29, rotate: 11, opacity: .28, ratio: '4 / 5' },
      { x: 15, y: 66, width: 24, rotate: -13, opacity: .22, ratio: '3 / 4' }
    ];
    const p = patterns[index % patterns.length];
    const drift = Math.floor(index / patterns.length) * 7;
    const x = Number.isFinite(item.x) ? item.x : Math.max(8, Math.min(82, p.x + (index % 2 ? -drift : drift)));
    const y = Number.isFinite(item.y) ? item.y : Math.max(4, Math.min(58, p.y + drift));
    const width = Number.isFinite(item.width) ? item.width : Math.max(18, p.width - Math.floor(index / 3) * 4);
    const rotate = Number.isFinite(item.rotate) ? item.rotate : p.rotate;
    const opacity = Number.isFinite(item.opacity) ? item.opacity : p.opacity;
    const ratio = item.ratio || p.ratio;

    const depth = Math.max(.38, 1 - index * .16);
    return `--stack-x:${x};--stack-y:${y};--stack-width:${width};--stack-rotate:${rotate}deg;--stack-opacity:${opacity};--stack-ratio:${esc(ratio)};--stack-z:${10 - index};--stack-depth:${depth}`;
  }

  function imageStack(slot, basePath) {
    return imageItems(slot).map((item, index) => {
      const src = resolveSrc(item.src, basePath);
      if (!src) return '';
      return `<img class="hero__stack-image" data-stack-index="${index}" style="${stackStyle(item, index)}" src="${esc(src)}" alt="${esc(item.alt || '')}" loading="${index === 0 ? 'eager' : 'lazy'}">`;
    }).join('');
  }

  function carouselOffset(index, active, total) {
    let offset = index - active;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
  }

  function carouselStyle(offset) {
    if (offset === 0) return { x: 61, y: 54, width: 40, rotate: 5, opacity: .52, z: 14, depth: 1 };
    if (offset === -1) return { x: 30, y: 58, width: 32, rotate: -9, opacity: .35, z: 10, depth: .82 };
    if (offset === 1) return { x: 78, y: 61, width: 31, rotate: 10, opacity: .33, z: 9, depth: .78 };

    const side = offset < 0 ? -1 : 1;
    const magnitude = Math.min(3, Math.abs(offset));
    return {
      x: 52 + side * (10 + magnitude * 5),
      y: 36 + magnitude * 9,
      width: Math.max(19, 27 - magnitude * 2),
      rotate: side * (12 + magnitude * 3),
      opacity: Math.max(.1, .22 - magnitude * .04),
      z: 7 - magnitude,
      depth: Math.max(.42, .68 - magnitude * .08)
    };
  }

  function applyCarousel(images, activeIndex) {
    const total = images.length;
    images.forEach((image, index) => {
      const style = carouselStyle(carouselOffset(index, activeIndex, total));
      image.style.setProperty('--stack-x', style.x);
      image.style.setProperty('--stack-y', style.y);
      image.style.setProperty('--stack-width', style.width);
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
    let activeIndex = 0;
    let lastSlide = 0;
    let nextAutoAt = performance.now() + 3400;
    let hovering = false;
    let lastMove = 0;
    let currentX = 0;
    let currentY = 0;
    let nextX = 0;
    let nextY = 0;

    target.classList.add('is-carousel');

    const setActive = index => {
      activeIndex = (index + images.length) % images.length;
      applyCarousel(images, activeIndex);
    };

    setActive(0);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const setMotion = (x, y, active) => {
      target.style.setProperty('--tilt-x', `${(-y * 18).toFixed(2)}deg`);
      target.style.setProperty('--tilt-y', `${(x * 22).toFixed(2)}deg`);
      target.style.setProperty('--shine-x', `${(50 + x * 45).toFixed(2)}%`);
      target.style.setProperty('--shine-y', `${(46 + y * 40).toFixed(2)}%`);
      images.forEach((image, index) => {
        const depth = parseFloat(image.style.getPropertyValue('--stack-depth')) || 1;
        const phase = index % 2 ? -1 : 1;
        image.style.setProperty('--image-x', `${(x * (56 + index * 8) * depth + phase * y * 8).toFixed(2)}px`);
        image.style.setProperty('--image-y', `${(y * (42 + index * 7) * depth + phase * x * 5).toFixed(2)}px`);
        image.style.setProperty('--image-scale', (1 + (active ? .055 : .018) * depth).toFixed(3));
      });
    };

    host.addEventListener('pointermove', event => {
      const rect = host.getBoundingClientRect();
      const px = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
      const py = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
      const now = performance.now();
      hovering = true;
      lastMove = now;
      nextX = px * 2;
      nextY = py * 2;
      nextAutoAt = now + 4600;
      if (images.length > 1 && now - lastSlide > 180) {
        const zone = Math.max(0, Math.min(images.length - 1, Math.floor((px + .5) * images.length)));
        if (zone !== activeIndex) {
          setActive(zone);
          lastSlide = now;
        }
      }
      target.classList.add('is-interacting');
    });

    host.addEventListener('pointerleave', () => {
      hovering = false;
      nextAutoAt = performance.now() + 1800;
      target.classList.remove('is-interacting');
    });

    const tick = now => {
      if (!hovering && images.length > 1 && now >= nextAutoAt) {
        setActive(activeIndex + 1);
        nextAutoAt = now + 4200;
      }
      if (!hovering || now - lastMove > 1400) {
        nextX = Math.sin(now / 1800) * .34 + Math.cos(now / 3100) * .16;
        nextY = Math.cos(now / 2200) * .28 + Math.sin(now / 2700) * .12;
        target.classList.remove('is-interacting');
      }
      currentX += (nextX - currentX) * .095;
      currentY += (nextY - currentY) * .095;
      setMotion(currentX, currentY, hovering);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function loadImageConfig() {
    const res = await fetch(`/config/images.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`config/images.json ${res.status}`);
    return res.json();
  }

  loadImageConfig().then(cfg => {
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
  }).catch(() => { });
})();
