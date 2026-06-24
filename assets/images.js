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
      { x: 68, y: 51, width: 38, rotate: 5, opacity: .38, ratio: '13 / 20' },
      { x: 28, y: 53, width: 31, rotate: -7, opacity: .28, ratio: '1 / 1' },
      { x: 50, y: 38, width: 28, rotate: 9, opacity: .22, ratio: '4 / 5' },
      { x: 16, y: 62, width: 24, rotate: -12, opacity: .20, ratio: '3 / 4' }
    ];
    const p = patterns[index % patterns.length];
    const drift = Math.floor(index / patterns.length) * 7;
    const x = Number.isFinite(item.x) ? item.x : Math.max(8, Math.min(82, p.x + (index % 2 ? -drift : drift)));
    const y = Number.isFinite(item.y) ? item.y : Math.max(4, Math.min(58, p.y + drift));
    const width = Number.isFinite(item.width) ? item.width : Math.max(18, p.width - Math.floor(index / 3) * 4);
    const rotate = Number.isFinite(item.rotate) ? item.rotate : p.rotate;
    const opacity = Number.isFinite(item.opacity) ? item.opacity : p.opacity;
    const ratio = item.ratio || p.ratio;

    return `--stack-x:${x};--stack-y:${y};--stack-width:${width};--stack-rotate:${rotate}deg;--stack-opacity:${opacity};--stack-ratio:${esc(ratio)};--stack-z:${10 - index}`;
  }

  function imageStack(slot, basePath) {
    return imageItems(slot).map((item, index) => {
      const src = resolveSrc(item.src, basePath);
      if (!src) return '';
      return `<img class="hero__stack-image" style="${stackStyle(item, index)}" src="${esc(src)}" alt="${esc(item.alt || '')}" loading="${index === 0 ? 'eager' : 'lazy'}">`;
    }).join('');
  }

  function bindHeroStackMotion(target) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const host = target.closest('.hero__copy') || target;
    let hovering = false;
    let lastMove = 0;

    const setTilt = (x, y) => {
      target.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`);
      target.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`);
    };

    host.addEventListener('pointermove', event => {
      const rect = host.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - .5;
      const py = (event.clientY - rect.top) / rect.height - .5;
      hovering = true;
      lastMove = performance.now();
      setTilt(py * -8, px * 10);
    });

    host.addEventListener('pointerleave', () => {
      hovering = false;
    });

    const tick = now => {
      if (!hovering || now - lastMove > 1400) {
        setTilt(Math.sin(now / 2400) * 2.6, Math.cos(now / 2800) * 3.4);
      }
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
  }).catch(() => {});
})();
