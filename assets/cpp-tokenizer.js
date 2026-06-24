(() => {
  const KEYWORDS = new Set('alignas alignof asm break case catch class concept const constexpr consteval constinit continue co_await co_return co_yield decltype default delete do else enum explicit export extern for friend goto if inline mutable namespace new noexcept operator private protected public register requires return sizeof static static_assert struct switch template this thread_local throw try typedef typename union using virtual volatile while'.split(' '));
  const TYPES = new Set('auto void bool char char8_t char16_t char32_t wchar_t short int long signed unsigned float double size_t ptrdiff_t string i8 i16 i32 i64 i128 u8 u16 u32 u64 u128 ll ull pii pll vi vll vector pair tuple array map set multiset unordered_map unordered_set priority_queue queue stack deque bitset complex'.split(' '));
  const CONSTS = new Set('true false nullptr NULL nullopt cin cout cerr clog endl INF LINF MOD mod EPS PI N M YES NO Yes No yes no'.split(' '));
  const STL = new Set('abs acos asin atan atan2 ceil cos exp fabs floor log log10 pow sin sqrt tan min max swap sort stable_sort reverse unique lower_bound upper_bound binary_search count find fill memset memcpy iota gcd lcm push_back pop_back emplace_back insert erase clear resize reserve begin end rbegin rend size empty front back top pop push emplace make_pair tie tuple_cat'.split(' '));
  const OPS = ['>>=', '<<=', '->*', '...', '++', '--', '->', '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '::', '<=>'];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const span = (c, s) => `<span class="${c}">${esc(s)}</span>`;
  const id0 = c => /[A-Za-z_]/.test(c || '');
  const id = c => /[A-Za-z0-9_]/.test(c || '');
  const spaces = (s, i) => { while (i < s.length && /\s/.test(s[i])) i++; return i; };
  const lineStyle = 'display:grid;grid-template-columns:3.8em minmax(0,max-content);min-width:max-content;line-height:1.2;min-height:1.2em;';
  const lnStyle = 'display:block;padding:0 1em 0 0;text-align:right;color:#66707d;user-select:none;border-right:1px solid rgba(102,204,255,.16);background:linear-gradient(90deg,rgba(43,45,48,.38),rgba(43,45,48,.14));font-variant-numeric:tabular-nums;';
  const srcStyle = 'display:block;padding:0 22px;white-space:pre;';

  function ensureStyle() {
    if (document.getElementById('cpp-tokenizer-style')) return;
    const style = document.createElement('style');
    style.id = 'cpp-tokenizer-style';
    style.textContent = `
      .texme-body pre code.line-numbered-code{display:block!important;padding:0!important;white-space:normal!important;line-height:1.2!important;tab-size:4!important}
      .texme-body .code-line{display:grid!important;grid-template-columns:3.8em minmax(0,max-content)!important;min-width:max-content!important;line-height:1.2!important;min-height:1.2em!important}
      .texme-body .code-line:hover{background:rgba(102,204,255,.055)!important}
      .texme-body .code-ln{display:block!important;padding:0 1em 0 0!important;text-align:right!important;color:#66707d!important;user-select:none!important;border-right:1px solid rgba(102,204,255,.16)!important;background:linear-gradient(90deg,rgba(43,45,48,.38),rgba(43,45,48,.14))!important;font-variant-numeric:tabular-nums!important}
      .texme-body .code-src{display:block!important;padding:0 22px!important;white-space:pre!important}
      .texme-body pre.has-copy{padding-top:48px!important}
      .texme-body .copy-code-btn{position:absolute;top:8px;right:10px;z-index:3;height:24px;padding:0 10px;border:1px solid rgba(102,204,255,.26);border-radius:999px;background:rgba(21,28,41,.72);color:#b6c7dc;font:700 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;backdrop-filter:blur(8px)}
      .texme-body .copy-code-btn:hover{border-color:rgba(102,204,255,.55);color:#66ccff;background:rgba(21,28,41,.92)}
      .texme-body .copy-code-btn.is-copied{color:#6aab73;border-color:rgba(106,171,115,.55)}
    `;
    document.head.append(style);
  }

  function readString(s, i, q) {
    let j = i + 1;
    while (j < s.length) {
      if (s[j] === '\\') j += 2;
      else if (s[j] === q) return j + 1;
      else j++;
    }
    return j;
  }

  function readNumber(s, i) {
    const m = /^(?:0[xX][0-9A-Fa-f']+|0[bB][01']+|(?:\d[\d']*\.?[\d']*|\.\d[\d']*)(?:[eE][+-]?\d[\d']*)?)(?:[uUlLfF]*)/.exec(s.slice(i));
    return m ? i + m[0].length : i + 1;
  }

  function readOp(s, i) {
    for (const op of OPS) if (s.startsWith(op, i)) return i + op.length;
    return i + 1;
  }

  function lineKind(line, i, word, j) {
    const k = spaces(line, j);
    const prev = i > 0 ? line[i - 1] : '';
    const prev2 = i > 1 ? line.slice(i - 2, i) : '';
    const next = line[k] || '';
    const next2 = line.slice(k, k + 2);

    if (KEYWORDS.has(word)) return 'jt-keyword';
    if (TYPES.has(word)) return 'jt-type';
    if (CONSTS.has(word) || /^[A-Z][A-Z0-9_]{1,}$/.test(word)) return 'jt-constant';
    if (STL.has(word)) return 'jt-stdlib';
    if (next2 === '::') return 'jt-namespace';
    if (prev === '.' || prev2 === '->' || prev2 === '::') return next === '(' ? 'jt-method' : 'jt-member';
    if (next === '(') return 'jt-function';
    if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) return 'jt-type';
    return 'jt-ident';
  }

  function highlightLine(line, state) {
    let out = '';
    let i = 0;

    if (state.block) {
      const end = line.indexOf('*/');
      if (end < 0) return { html: span('jt-comment', line), block: true };
      out += span('jt-comment', line.slice(0, end + 2));
      i = end + 2;
      state.block = false;
    }

    if (/^\s*#/.test(line.slice(i))) {
      const m = /^(\s*)(#\s*[A-Za-z_][A-Za-z0-9_]*)([\s\S]*)$/.exec(line);
      if (m) {
        out += esc(m[1]) + span('jt-directive', m[2]);
        let rest = esc(m[3]).replace(/(&lt;[^&]+&gt;)/g, x => `<span class="jt-include">${x}</span>`);
        return { html: out + rest, block: false };
      }
    }

    while (i < line.length) {
      const ch = line[i];
      const two = line.slice(i, i + 2);
      if (two === '//') { out += span('jt-comment', line.slice(i)); break; }
      if (two === '/*') {
        const end = line.indexOf('*/', i + 2);
        if (end < 0) { out += span('jt-comment', line.slice(i)); state.block = true; break; }
        out += span('jt-comment', line.slice(i, end + 2)); i = end + 2; continue;
      }
      if (ch === '"' || ch === "'") { const j = readString(line, i, ch); out += span(ch === '"' ? 'jt-string' : 'jt-char', line.slice(i, j)); i = j; continue; }
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(line[i + 1] || ''))) { const j = readNumber(line, i); out += span('jt-number', line.slice(i, j)); i = j; continue; }
      if (id0(ch)) { let j = i + 1; while (j < line.length && id(line[j])) j++; const word = line.slice(i, j); out += span(lineKind(line, i, word, j), word); i = j; continue; }
      if ('+-*/%=!<>&|^~?:.'.includes(ch) || OPS.some(op => line.startsWith(op, i))) { const j = readOp(line, i); out += span('jt-operator', line.slice(i, j)); i = j; continue; }
      if ('(){}[];,'.includes(ch)) { out += span('jt-punctuation', ch); i++; continue; }
      out += esc(ch); i++;
    }
    return { html: out, block: state.block };
  }

  function highlightCpp(source) {
    const lines = source.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
    const state = { block: false };
    return lines.map((line, idx) => {
      const res = highlightLine(line, state);
      state.block = res.block;
      return `<span class="code-line" style="${lineStyle}"><span class="code-ln" style="${lnStyle}">${idx + 1}</span><span class="code-src" style="${srcStyle}">${res.html || '&#8203;'}</span></span>`;
    }).join('');
  }

  function isCppBlock(code) {
    const cls = code.className || '';
    const src = code.textContent || '';
    return /language-(cpp|c\+\+|c)\b/.test(cls) || /#\s*include|using\s+namespace\s+std|bits\/stdc\+\+/.test(src);
  }

  function addCopyButton(pre, raw) {
    if (pre.querySelector('.copy-code-btn')) return;
    pre.classList.add('has-copy');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-code-btn';
    btn.textContent = 'COPY';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(raw);
        btn.textContent = 'COPIED'; btn.classList.add('is-copied');
        setTimeout(() => { btn.textContent = 'COPY'; btn.classList.remove('is-copied'); }, 1200);
      } catch { btn.textContent = 'FAIL'; setTimeout(() => btn.textContent = 'COPY', 1200); }
    });
    pre.append(btn);
  }

  function enhance(root = document) {
    ensureStyle();
    root.querySelectorAll('pre code').forEach(code => {
      const pre = code.closest('pre');
      if (!pre) return;
      const raw = code.dataset.rawCode || code.textContent;
      code.dataset.rawCode = raw;
      addCopyButton(pre, raw);
      if (code.dataset.cppEnhanced === '1') return;
      if (!isCppBlock(code)) return;
      code.style.display = 'block';
      code.style.padding = '0';
      code.style.whiteSpace = 'normal';
      code.style.lineHeight = '1.2';
      code.innerHTML = highlightCpp(raw);
      code.dataset.cppEnhanced = '1';
      code.classList.add('jetbrains-code', 'line-numbered-code');
    });
  }

  const observer = new MutationObserver(() => enhance());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhance();
})();
