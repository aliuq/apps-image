<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LucideSearch from '~icons/lucide/search'
import { defineShortcuts } from '../composables/defineShortcuts'
import { formatMethodOption, formatTypeOption } from '../lib/formatters'

interface Props {
  methodOptions: string[]
}

defineProps<Props>()

const { t } = useI18n()
const query = defineModel<string>('query', { required: true })
const typeFilter = defineModel<'all' | 'app' | 'base'>('typeFilter', { required: true })
const methodFilter = defineModel<string>('methodFilter', { required: true })

const input = computed<HTMLInputElement | null>(
  () => document.getElementById('search-input') as HTMLInputElement,
)

function focusSearch() {
  input.value?.focus()
  input.value?.select()
}
function blurSearch() {
  input.value?.blur()
}

defineShortcuts({
  '/': () => focusSearch(),
  escape: {
    usingInput: true,
    handler: () => blurSearch(),
  },
})
</script>

<template>
  <section class="pb-6">
    <Card class="border bg-card">
      <CardContent class="p-4">
        <div class="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <InputGroup>
            <InputGroupInput
              :placeholder="t('common.search')"
              v-model="query"
              aria-label="Search applications and base images"
              id="search-input"
            />
            <InputGroupAddon>
              <LucideSearch class="size-4" />
            </InputGroupAddon>

            <InputGroupAddon align="inline-end">
              <KbdGroup>
                <Kbd>/</Kbd>
              </KbdGroup>
            </InputGroupAddon>
          </InputGroup>

          <Select v-model="typeFilter">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="formatTypeOption(typeFilter, t)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in ['all', 'app', 'base']" :key="item" :value="item">
                {{ formatTypeOption(item, t) }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="methodFilter">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="formatMethodOption(methodFilter, t)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in methodOptions" :key="item" :value="item">
                {{ formatMethodOption(item, t) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
