export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* A secure context can still deny clipboard permission. */ }
  const previous = document.activeElement;
  const selection = document.getSelection();
  const ranges = Array.from({ length: selection?.rangeCount || 0 }, (_, i) => selection.getRangeAt(i).cloneRange());
  const field = document.createElement('textarea');
  field.className = 'clipboard-buffer';
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.append(field);
  field.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Caller displays failure. */ }
  field.remove();
  previous?.focus({ preventScroll: true });
  selection?.removeAllRanges();
  ranges.forEach(range => { if (range.commonAncestorContainer.isConnected) selection?.addRange(range); });
  return copied;
}
