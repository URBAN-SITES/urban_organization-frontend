<script setup lang="ts">
defineProps<{ stream: MediaStream | null; muted?: boolean; mirrored?: boolean }>()
</script>

<template>
  <!-- srcObject só existe como propriedade do elemento, não como atributo -->
  <video
    :srcObject.prop="stream"
    autoplay
    playsinline
    :muted="muted"
    :class="['size-full object-cover', mirrored ? '-scale-x-100' : '']"
  />
</template>
