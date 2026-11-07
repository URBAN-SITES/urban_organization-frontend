import DOMPurify from 'dompurify'
import { Marked, type Tokens } from 'marked'

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// GitHub-flavored Markdown: tables, task lists and fenced code, with line breaks kept
const markdown = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    // code blocks get a header with the language and a copy button (see aiMarkdown.vue)
    code({ text, lang }: Tokens.Code) {
      const language = (lang ?? '').trim().split(/\s/)[0] ?? ''
      return (
        `<div class="md-code"><div class="md-code-bar"><span>${escape(language || 'código')}</span>` +
        `<button type="button" data-copy>Copiar</button></div>` +
        `<pre><code>${escape(text)}</code></pre></div>`
      )
    },
    // wide tables scroll inside their own box instead of breaking the layout
    table(token: Tokens.Table) {
      const head = token.header
        .map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`)
        .join('')
      const rows = token.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`,
        )
        .join('')
      return `<div class="md-table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
    },
  },
})

/** The assistant's Markdown as safe HTML: model text never runs scripts or styles. */
export function renderMarkdown(text: string): string {
  const html = markdown.parse(text, { async: false }) as string
  const clean = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['style', 'form', 'iframe'],
    FORBID_ATTR: ['style'],
  })
  // links open outside the app, without handing it the opener
  return clean.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
}
