<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import type { OrganizationLocation } from '../types'

const props = defineProps<{ disabled: boolean }>()
const location = defineModel<OrganizationLocation | null>({ required: true })
const emit = defineEmits<{ ready: [value: boolean] }>()
const mode = ref<'none' | 'current' | 'search'>('none')
const locating = ref(false)
const searchLoading = ref(false)
const selectedPlace = ref('')
const error = ref('')
const searchContainer = ref<HTMLDivElement>()
let geocoder: MapboxGeocoder | undefined
let revision = 0

const ready = computed(() => !locating.value && (mode.value === 'none' || !!location.value))
watch(ready, (value) => emit('ready', value), { immediate: true })

function disposeSearch() {
  geocoder?.onRemove()
  geocoder = undefined
}

function locate() {
  const request = ++revision
  location.value = null
  error.value = ''
  if (!navigator.geolocation) {
    error.value = 'Seu navegador não oferece localização. Digite a localização.'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (request !== revision) return
      location.value = { latitude: coords.latitude, longitude: coords.longitude }
      locating.value = false
    },
    (cause) => {
      if (request !== revision) return
      locating.value = false
      error.value =
        cause.code === 1
          ? 'Permita o acesso à localização no navegador ou digite a localização.'
          : 'Não foi possível obter sua localização. Tente novamente ou digite a localização.'
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  )
}

async function openSearch() {
  const request = ++revision
  error.value = ''
  disposeSearch()
  const accessToken = import.meta.env.VITE_MAPBOX_API_KEY?.trim()
  if (!accessToken) {
    error.value = 'A busca está indisponível. Use a localização atual ou escolha não informar.'
    return
  }
  searchLoading.value = true
  try {
    const { default: MapboxGeocoder } = await import('@mapbox/mapbox-gl-geocoder')
    await nextTick()
    if (request !== revision || !searchContainer.value) return
    const instance = new MapboxGeocoder({
      accessToken,
      marker: false,
      placeholder: 'Digite uma cidade, endereço ou lugar',
      language: 'pt-BR',
    })
    instance.addTo(searchContainer.value)
    geocoder = instance
    const input = searchContainer.value.querySelector('input')
    input?.setAttribute('aria-label', 'Buscar localização')
    input?.setAttribute('aria-describedby', 'organization-location-help')
    instance.on('result', ({ result }) => {
      if (request !== revision || props.disabled) return
      const [longitude, latitude] = result.center
      if (longitude === undefined || latitude === undefined) return
      location.value = { latitude, longitude }
      selectedPlace.value = result.place_name
      searchLoading.value = false
      error.value = ''
    })
    instance.on('clear', clearSelection)
    instance.on('loading', () => {
      if (request === revision) searchLoading.value = true
    })
    instance.on('results', (response: unknown) => {
      if (request !== revision) return
      searchLoading.value = false
      if (
        typeof response === 'object' &&
        response &&
        'features' in response &&
        Array.isArray(response.features)
      ) {
        error.value = response.features.length
          ? ''
          : 'Nenhum local encontrado. Tente outro endereço ou cidade.'
      }
    })
    instance.on('error', () => {
      if (request !== revision) return
      searchLoading.value = false
      error.value = 'Não foi possível buscar a localização. Tente novamente.'
    })
  } catch {
    if (request !== revision) return
    disposeSearch()
    error.value = 'Não foi possível abrir a busca. Tente novamente ou use a localização atual.'
  } finally {
    if (request === revision) searchLoading.value = false
  }
}

function clearSelection() {
  if (props.disabled) return
  location.value = null
  selectedPlace.value = ''
  error.value = ''
}

function editSearch(event: Event) {
  if (props.disabled) return
  if (location.value && geocoder && event.target instanceof HTMLInputElement) {
    const input = event.target
    const { value, selectionStart, selectionEnd } = input
    // The geocoder suppresses repeated selections until its previous result is cleared.
    geocoder.clear()
    geocoder.setInput(value)
    input.setSelectionRange(selectionStart, selectionEnd)
  }
  clearSelection()
}

function preventSearchSubmit(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement) event.preventDefault()
}

watch(mode, (value) => {
  revision++
  locating.value = false
  searchLoading.value = false
  selectedPlace.value = ''
  error.value = ''
  disposeSearch()
  location.value = null
  if (value === 'none') return
  else if (value === 'current') locate()
  else void openSearch()
})
onBeforeUnmount(() => {
  revision++
  disposeSearch()
})
</script>

<template>
  <fieldset :disabled="disabled" class="flex flex-col gap-2">
    <legend class="mb-2 text-13 font-medium text-fg">
      Localização <span class="font-normal text-fg-muted">(opcional)</span>
    </legend>
    <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Localização">
      <label
        v-for="choice in [
          { value: 'none', label: 'Não informar' },
          { value: 'current', label: 'Localização atual' },
          { value: 'search', label: 'Digitar localização' },
        ]"
        :key="choice.value"
        :class="[
          'inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-13 select-none',
          'transition-[background-color,border-color,color] duration-(--dur-fast) ease-out',
          'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
          mode === choice.value
            ? 'border-fg bg-fg text-bg'
            : 'border-border bg-surface-1 text-fg-muted hover:border-border-strong hover:text-fg',
        ]"
      >
        <input
          v-model="mode"
          type="radio"
          name="organization-location"
          :value="choice.value"
          class="sr-only"
        />
        {{ choice.label }}
      </label>
    </div>
    <p v-if="locating || searchLoading" class="text-12 text-fg-muted" role="status">
      {{ locating ? 'Obtendo sua localização…' : 'Buscando localização…' }}
    </p>
    <div
      v-if="mode === 'search'"
      :inert="disabled"
      class="location-search"
      @keydown.enter="preventSearchSubmit"
      @input="editSearch"
    >
      <p id="organization-location-help" class="mb-1.5 text-12 text-fg-muted">
        Digite a localização e escolha uma das sugestões.
      </p>
      <div ref="searchContainer" />
    </div>
    <p v-if="location && mode !== 'none'" class="text-12 text-success" role="status">
      {{ mode === 'current' ? 'Localização atual obtida.' : selectedPlace }}
    </p>
    <p v-if="error" class="text-12 text-danger" role="alert">
      {{ error }}
      <button
        v-if="mode !== 'none'"
        type="button"
        class="ml-1 cursor-pointer font-medium text-fg underline underline-offset-4"
        @click="mode === 'current' ? locate() : openSearch()"
      >
        Tentar novamente
      </button>
    </p>
  </fieldset>
</template>

<style scoped>
/* o geocoder do Mapbox monta o próprio DOM; só alinhamos com os tokens */
.location-search :deep(.mapboxgl-ctrl-geocoder) {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-2);
  color: var(--color-fg);
  font: inherit;
  font-size: 14px;
  box-shadow: none;
}
.location-search :deep(.mapboxgl-ctrl-geocoder:focus-within) {
  border-color: var(--color-accent);
}
.location-search :deep(.mapboxgl-ctrl-geocoder input) {
  height: 44px;
  color: inherit;
  font-size: 14px;
}
.location-search :deep(.mapboxgl-ctrl-geocoder input:focus) {
  outline: none;
}
.location-search :deep(.mapboxgl-ctrl-geocoder--icon-search),
.location-search :deep(.mapboxgl-ctrl-geocoder--pin-right > *) {
  top: 12px;
}
.location-search :deep(.suggestions),
.location-search :deep(.mapboxgl-ctrl-geocoder button) {
  background: var(--color-surface-1);
  color: var(--color-fg);
}
.location-search :deep(.suggestions > .active > a),
.location-search :deep(.suggestions > li > a:hover) {
  background: var(--color-surface-2);
}
</style>
