<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  src: string
  alt: string
  fallback?: string
}

const props = withDefaults(defineProps<Props>(), {
  fallback: '',
})

const imageError = ref(false)
const imageLoaded = ref(false)

const handleError = () => {
  imageError.value = true
}

const handleLoad = () => {
  imageLoaded.value = true
}
</script>

<template>
  <img
    v-if="!imageError"
    :src="props.src"
    :alt="props.alt"
    class="h-5 transition-opacity duration-200 hover:opacity-80"
    :class="{ 'opacity-0': !imageLoaded }"
    loading="lazy"
    @error="handleError"
    @load="handleLoad"
  />
  <div
    v-else-if="fallback"
    class="h-5 flex items-center text-xs text-muted-foreground"
  >
    {{ fallback }}
  </div>
</template>
