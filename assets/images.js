(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function resolveSrc(src, basePath) {
    const raw = String(src || '').trim();
    if (!raw) return '';
    if (/^(?:https?:)?\/\//.test(raw) || raw.startsWith('/')) return raw;
    return `${basePath || ''}${raw}`;
  }

  function frame(slot, basePath) {
    const src = resolveSrc(slot.src, basePath);
    const media = src
      ? `<img src="${esc(src)}" alt="${esc(slot.alt || '')}" loading="lazy">`
      : '<div class="anime-frame__placeholder" aria-hidden="true"></div>';
    return `<figure class="anime-frame${src ? ' has-image' : ' is-empty'}">${media}<figcaption><span>${esc(slot.title || '')}</span><small>${esc(slot.caption || '')}</small></figcaption></figure>`;
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
  }).catch(() => {});
})();
