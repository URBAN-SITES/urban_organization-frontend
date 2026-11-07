<script setup lang="ts">
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { renderMarkdown } from '@/modules/ai/utils/markdown'

/** Resposta da IA em Markdown: títulos, listas, tabelas, checklists e blocos de código. */
const props = defineProps<{ text: string }>()
const html = computed(() => renderMarkdown(props.text))

async function onClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]')
  if (!button) return
  const code = button.closest('.md-code')?.querySelector('code')?.textContent ?? ''
  try {
    await navigator.clipboard.writeText(code)
    button.textContent = 'Copiado!'
    window.setTimeout(() => (button.textContent = 'Copiar'), 1500)
  } catch {
    toast.error('Não foi possível copiar.')
  }
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitizado por DOMPurify em renderMarkdown -->
  <div class="ai-md" @click="onClick" v-html="html" />
</template>

<style scoped>
.ai-md {
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-fg);
  overflow-wrap: anywhere;
}
.ai-md :deep(> * + *) {
  margin-top: 0.75em;
}
.ai-md :deep(h1),
.ai-md :deep(h2),
.ai-md :deep(h3),
.ai-md :deep(h4) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 650;
  line-height: 1.3;
  margin-top: 1.1em;
}
.ai-md :deep(h1) {
  font-size: 19px;
}
.ai-md :deep(h2) {
  font-size: 17px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}
.ai-md :deep(h3) {
  font-size: 15px;
}
.ai-md :deep(h3)::before {
  content: '';
  width: 4px;
  height: 1em;
  border-radius: 2px;
  background: var(--color-accent);
}
.ai-md :deep(h4) {
  font-size: 14px;
  color: var(--color-fg-muted);
}
.ai-md :deep(> :first-child) {
  margin-top: 0;
}
.ai-md :deep(strong) {
  font-weight: 650;
}
.ai-md :deep(a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ai-md :deep(ul),
.ai-md :deep(ol) {
  padding-left: 1.3em;
}
.ai-md :deep(ul) {
  list-style: disc;
}
.ai-md :deep(ol) {
  list-style: decimal;
}
.ai-md :deep(li + li) {
  margin-top: 0.3em;
}
.ai-md :deep(li::marker) {
  color: var(--color-accent);
}
/* checklists (- [ ] / - [x]) */
.ai-md :deep(li:has(> input[type='checkbox'])) {
  list-style: none;
  margin-left: -1.3em;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.ai-md :deep(input[type='checkbox']) {
  margin-top: 0.35em;
  accent-color: var(--color-accent);
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.ai-md :deep(blockquote) {
  border-left: 3px solid var(--color-accent);
  background: var(--color-accent-soft, rgb(255 103 0 / 0.08));
  padding: 8px 12px;
  border-radius: 0 8px 8px 0;
  color: var(--color-fg);
}
.ai-md :deep(hr) {
  border: 0;
  border-top: 1px solid var(--color-border);
}
.ai-md :deep(:not(pre) > code) {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.88em;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}
.ai-md :deep(.md-code) {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-surface-2);
}
.ai-md :deep(.md-code-bar) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--color-fg-muted);
  border-bottom: 1px solid var(--color-border);
}
.ai-md :deep(.md-code-bar button) {
  cursor: pointer;
  border-radius: 6px;
  padding: 2px 8px;
  color: var(--color-fg);
}
.ai-md :deep(.md-code-bar button:hover) {
  background: var(--color-surface-3);
}
.ai-md :deep(pre) {
  overflow-x: auto;
  padding: 12px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12.5px;
  line-height: 1.55;
}
.ai-md :deep(.md-table) {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}
.ai-md :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ai-md :deep(th) {
  text-align: left;
  font-weight: 600;
  background: var(--color-surface-2);
  color: var(--color-fg-muted);
}
.ai-md :deep(th),
.ai-md :deep(td) {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}
.ai-md :deep(tr:last-child td) {
  border-bottom: 0;
}
</style>
