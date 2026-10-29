<script setup lang="ts">
import { PageLayout } from '@/shared/components'
import '../payments.css'

withDefaults(defineProps<{ crumbs: string[]; title?: string; description?: string }>(), {
  title: '',
  description: '',
})
</script>

<template>
  <PageLayout :crumbs="crumbs" :title="title" :description="description" width="wide">
    <template v-if="$slots.top" #top><slot name="top" /></template>
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    <slot />
  </PageLayout>
</template>
