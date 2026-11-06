<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { UiDialog } from '@/shared/components'
import { useQuickActionsStore } from '../stores/quick'
import { SHORTCUT_GROUPS, isPlainShortcut, modalIsOpen } from '../utils/shortcuts'

/** Ajuda dos atalhos de teclado (tecla ?). */
const quick = useQuickActionsStore()

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key !== '?' || !isPlainShortcut(event, modalIsOpen())) return
  event.preventDefault()
  quick.shortcutsOpen = true
})
</script>

<template>
  <UiDialog v-model:open="quick.shortcutsOpen" title="Atalhos do teclado">
    <div class="grid gap-6">
      <section v-for="group in SHORTCUT_GROUPS" :key="group.title" class="grid gap-2">
        <h3 class="text-12 font-medium tracking-wide text-fg-muted uppercase">{{ group.title }}</h3>
        <dl class="grid gap-1">
          <div
            v-for="item in group.items"
            :key="item.label"
            class="flex items-center justify-between gap-4 rounded-control px-2 py-1.5 text-13 hover:bg-surface-2"
          >
            <dt class="text-fg">{{ item.label }}</dt>
            <dd class="flex shrink-0 gap-1">
              <kbd v-for="k in item.keys" :key="k" class="kbd">{{ k }}</kbd>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </UiDialog>
</template>

<style>
.kbd {
  display: inline-grid;
  min-width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--ds-border-strong);
  border-bottom-width: 2px;
  border-radius: 6px;
  background: var(--ds-surface-2);
  padding-inline: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-12);
  color: var(--ds-fg);
}
</style>
