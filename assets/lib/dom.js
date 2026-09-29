export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export function element(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function setText(selector, value, root = document) {
  const node = root.querySelector(selector);
  if (node && value != null) node.textContent = value;
}

export function contentRendered() {
  window.dispatchEvent(new Event('tdk:content-rendered'));
}

export function showError(target, message, retry) {
  const box = element('div', 'card load-error');
  box.setAttribute('role', 'alert');
  box.append(element('p', '', message));
  if (retry) {
    const button = element('button', 'btn', '重新加载');
    button.type = 'button';
    button.addEventListener('click', retry, { once: true });
    box.append(button);
  }
  target.replaceChildren(box);
  contentRendered();
}
