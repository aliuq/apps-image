<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn('rounded-xl border bg-card text-card-foreground shadow-sm', props.class)"
  >
    <slot />
  </Primitive>
</template>
