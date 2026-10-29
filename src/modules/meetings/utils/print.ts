import type { MeetingInsight } from '../types'
import { clock } from './index'

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  )

/** Página só com o resumo e a transcrição; a impressão do navegador salva em PDF. */
export function insightPrintHtml(title: string, when: string, insight: MeetingInsight): string {
  const summary = insight.summary
  const list = (items: { text: string; at: number | null }[]) =>
    `<ul>${items
      .map(
        (item) =>
          `<li>${item.at === null ? '' : `<b>${clock(item.at)}</b> `}${escape(item.text)}</li>`,
      )
      .join('')}</ul>`
  const parts: string[] = [`<h1>${escape(title)}</h1><p class="muted">${escape(when)}</p>`]
  if (summary) {
    parts.push(`<h2>Resumo</h2><p>${escape(summary.executive_summary)}</p>`)
    const sections: [string, { text: string; at: number | null }[]][] = [
      ['Tópicos', summary.topics.map((t) => ({ text: t.title, at: t.source?.start ?? null }))],
      ...(
        [
          ['Decisões', summary.decisions],
          ['Problemas', summary.problems],
          ['Próximos passos', summary.next_steps],
          ['Perguntas em aberto', summary.open_questions],
        ] as const
      ).map(
        ([name, points]) =>
          [name, points.map((p) => ({ text: p.text, at: p.source?.start ?? null }))] as [
            string,
            { text: string; at: number | null }[],
          ],
      ),
    ]
    for (const [name, items] of sections)
      if (items.length) parts.push(`<h2>${name}</h2>${list(items)}`)
    if (summary.actions.length) {
      parts.push(
        `<h2>Ações sugeridas</h2><ul>${summary.actions
          .map(
            (a) =>
              `<li><b>${escape(a.title)}</b> (${escape(a.assignee_name ?? 'sem responsável identificado')}; ${escape(a.due_date ?? 'sem prazo identificado')})<br><span class="muted">${clock(a.source.start)} “${escape(a.source.quote)}”</span></li>`,
          )
          .join('')}</ul>`,
      )
    }
  }
  parts.push(
    `<h2>Transcrição</h2>${insight.segments
      .map((s) => `<p><b>${clock(s.start)}</b> ${escape(s.text)}</p>`)
      .join('')}`,
  )
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(title)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:720px;margin:32px auto;padding:0 16px}
h1{font-size:24px;margin:0}h2{font-size:16px;margin:24px 0 8px}.muted{color:#555}b{font-variant-numeric:tabular-nums}</style>
</head><body>${parts.join('')}</body></html>`
}

export function printInsight(title: string, when: string, insight: MeetingInsight): boolean {
  const win = window.open('', '_blank')
  if (!win) return false // bloqueado pelo navegador
  win.document.write(insightPrintHtml(title, when, insight))
  win.document.close()
  win.focus()
  win.print()
  return true
}
