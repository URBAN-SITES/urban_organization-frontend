/**
 * Markdown simples e seguro para as páginas do projeto: todo o texto é escapado antes,
 * e só links http(s) viram <a>. Cobre títulos, listas (com caixas), citações, código,
 * linha divisória, negrito, itálico e código em linha.
 */
const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(text: string): string {
  const codes: string[] = []
  // código em linha primeiro: o que está dentro não recebe outra formatação
  let out = escape(text).replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(code)
    return `\uE000${codes.length - 1}\uE000`
  })
  out = out
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>')
  return out.replace(/\uE000(\d+)\uE000/g, (_, i: string) => `<code>${codes[Number(i)]}</code>`)
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let paragraph: string[] = []
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null
  let quote: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.map(inline).join('<br>')}</p>`)
    paragraph = []
  }
  const flushList = () => {
    if (list) html.push(`<${list.tag}>${list.items.join('')}</${list.tag}>`)
    list = null
  }
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`)
    quote = []
  }
  const flush = () => {
    flushParagraph()
    flushList()
    flushQuote()
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.startsWith('```')) {
      flush()
      const code: string[] = []
      while (++i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i]!)
      html.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`)
      continue
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      flush()
      const level = heading[1]!.length + 1 // # vira h2: o título da página já é o h1
      html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`)
      continue
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush()
      html.push('<hr>')
      continue
    }
    const task = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line)
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (task || bullet || numbered) {
      flushParagraph()
      flushQuote()
      const tag = numbered && !bullet ? 'ol' : 'ul'
      if (!list || list.tag !== tag) {
        flushList()
        list = { tag, items: [] }
      }
      if (task) {
        const done = task[1] !== ' '
        list.items.push(
          `<li class="md-task" data-done="${done}"><span class="md-box" aria-hidden="true"></span><span class="sr-only">${done ? 'Feito: ' : 'A fazer: '}</span>${inline(task[2]!)}</li>`,
        )
      } else list.items.push(`<li>${inline((bullet ?? numbered)![1]!)}</li>`)
      continue
    }
    const quoted = /^>\s?(.*)$/.exec(line)
    if (quoted) {
      flushParagraph()
      flushList()
      quote.push(quoted[1]!)
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    flushList()
    flushQuote()
    paragraph.push(line)
  }
  flush()
  return html.join('')
}
