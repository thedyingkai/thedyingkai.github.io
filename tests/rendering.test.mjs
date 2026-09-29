import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { renderMarkdown } from '../assets/markdown-renderer.js';
import { splitHighlightedLines, normalizeLanguage } from '../assets/code-blocks.js';

const sandbox = vm.createContext({});
vm.runInContext(await readFile(new URL('../assets/vendor/marked/4.0.12/marked.min.js', import.meta.url), 'utf8'), sandbox);
const marked = sandbox.marked;
const render = source => renderMarkdown(source, marked);

test('code remains escaped and intact, including math-like strings and backslashes', () => {
  const code = 'cout << "$<tag>&$" << "\\n";\n// \\(x\\) and $$<b>$$\n';
  const html = render('```cpp\n' + code + '```');
  assert.match(html, /&lt;tag&gt;&amp;/);
  assert.doesNotMatch(html, /math-source|<tag>|<b>/);
  assert.match(html, /\\n/);
});
test('inline, indented and nested fenced code do not become math', () => {
  for (const source of ['`$<b>$`', '    $<b>$\n', '> ```text\n> $<b>$\n> ```', '- example\n\n  ```text\n  $<b>$\n  ```']) {
    const html = render(source);
    assert.doesNotMatch(html, /math-source|<b>/, source);
    assert.match(html, /&lt;b&gt;/);
  }
});
test('inline and display math preserve LaTeX and escape HTML characters', () => {
  for (const source of ['$x$', '$dp_{k,x}$', '$a < b & c > d$', '$$\n\\begin{aligned}a&<b\\\\c&=d\\end{aligned}\n$$', '\\(x_1\\)', '\\[x_2\\]']) {
    const html = render(source);
    assert.match(html, /math-source/, source);
    assert.doesNotMatch(html, /<em>/, source);
  }
  assert.match(render('$a < b$'), /&lt;/);
  assert.doesNotMatch(render('cost \\$5 and \\$10'), /math-source/);
});
test('normal Markdown, long fences and literal TexMe mask marker work', () => {
  assert.match(render('**bold**'), /<strong>bold<\/strong>/);
  assert.match(render('::MASK::'), /::MASK::/);
  assert.doesNotMatch(render('````text\n```\n$<b>$\n````'), /math-source|<b>/);
});
test('multiline highlight spans are balanced on every row', () => {
  assert.deepEqual(splitHighlightedLines('<span class="hljs-comment">a\nb\n</span>x'), [
    '<span class="hljs-comment">a</span>', '<span class="hljs-comment">b</span>', '<span class="hljs-comment"></span>x'
  ]);
  assert.deepEqual(splitHighlightedLines('a\n\nb'), ['a', '', 'b']);
  assert.equal(normalizeLanguage('C++'), 'cpp');
  assert.equal(normalizeLanguage('txt'), 'plaintext');
});
test('every published Markdown file renders without losing code block content', async () => {
  const directory = new URL('../posts/', import.meta.url);
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.md') || file.startsWith('_')) continue;
    const source = await readFile(new URL(file, directory), 'utf8');
    const html = render(source);
    assert.ok(html.length, file);
    const expected = [];
    marked.walkTokens(marked.lexer(source), token => { if (token.type === 'code') expected.push(token.text); });
    const actual = [...html.matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map(match => match[1]
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    assert.deepEqual(actual, expected.map(code => code.replace(/\n$/, '') + '\n'), file);
  }
});
