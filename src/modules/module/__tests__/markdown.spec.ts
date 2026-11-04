import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderMarkdown } from '../utils/markdown.ts'

test('escapa HTML e só aceita links http(s)', () => {
  assert.equal(
    renderMarkdown('<script>x</script> [a](javascript:alert(1)) [b](https://ok.dev)'),
    '<p>&lt;script&gt;x&lt;/script&gt; [a](javascript:alert(1)) <a href="https://ok.dev" target="_blank" rel="noopener noreferrer">b</a></p>',
  )
})

test('títulos, listas, caixas e código', () => {
  const html = renderMarkdown(
    '# Plano\n\n- um\n- **dois**\n\n1. a\n2. b\n\n- [x] feito\n- [ ] falta\n\n```\n<b>\n```\n> nota `x*y*`',
  )
  assert.equal(
    html,
    '<h2>Plano</h2><ul><li>um</li><li><strong>dois</strong></li></ul><ol><li>a</li><li>b</li></ol>' +
      '<ul><li class="md-task" data-done="true"><span class="md-box" aria-hidden="true"></span><span class="sr-only">Feito: </span>feito</li>' +
      '<li class="md-task" data-done="false"><span class="md-box" aria-hidden="true"></span><span class="sr-only">A fazer: </span>falta</li></ul>' +
      '<pre><code>&lt;b&gt;</code></pre><blockquote>nota <code>x*y*</code></blockquote>',
  )
})

test('parágrafos juntam linhas e itálico não pega snake_case', () => {
  assert.equal(
    renderMarkdown('linha um\nlinha _dois_ e nome_de_arquivo'),
    '<p>linha um<br>linha <em>dois</em> e nome_de_arquivo</p>',
  )
})
