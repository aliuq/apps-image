<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computed } from 'vue'
import LucideBookOpen from '~icons/lucide/book-open'
import LucideGithub from '~icons/lucide/github'
import LucidePackage from '~icons/lucide/package'
import type { AppItem } from '../data/types'
import { DOCKER } from '../lib/constants'
import LazyImage from './LazyImage.vue'

interface Props {
  item: AppItem
}

const props = defineProps<Props>()

const enabledVariants = computed(() => {
  return Object.entries(props.item.variants)
    .filter(([, variant]) => variant?.enabled !== false)
    .map(([key]) => key)
})

const pullsImageUrl = computed(
  () =>
    `${DOCKER.SHIELDS_API}/pulls/${DOCKER.REGISTRY}/${props.item.name}?label=Pulls&logo=docker&logoColor=white`,
)

const getVariantImageUrl = (variant: string) =>
  `${DOCKER.SHIELDS_API}/image-size/${DOCKER.REGISTRY}/${props.item.name}/${variant}?label=${variant}&logo=docker&logoColor=white`
</script>

<template>
  <Card class="group flex h-full flex-col border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-lg">
    <CardHeader class="p-4 flex-1">
      <!-- 顶部：名称和类型徽章 -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <CardTitle class="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary font-archivo">
          {{ item.name }}
        </CardTitle>
        <Badge variant="secondary" class="text-xs font-medium shrink-0">{{ item.type }}</Badge>
      </div>

      <!-- 版本信息：突出显示 -->
      <div class="flex items-center gap-3 mb-3">
        <div class="flex items-baseline gap-2 text-sm text-muted-foreground">
          <span class="font-bold font-archivo">{{ item.version }}</span>
          <span class="uppercase tracking-wider">{{ item.latestVersion }}</span>
        </div>
        <Badge v-if="item.license" variant="outline" class="text-[10px] shrink-0">{{ item.license }}</Badge>
      </div>

      <!-- 描述：简洁明了 -->
      <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {{ item.slogan || item.description }}
      </p>
    </CardHeader>

    <CardContent class="flex flex-col gap-5 p-4 pt-0">
      <!-- 统计信息：Docker 拉取和镜像大小 -->
      <div class="flex flex-wrap items-center gap-2">
        <LazyImage
          :src="pullsImageUrl"
          :alt="`Docker pulls for ${item.name}`"
          fallback="Pulls: N/A"
        />
        <LazyImage
          v-for="variant in enabledVariants"
          :key="variant"
          :src="getVariantImageUrl(variant)"
          :alt="`Docker image size for ${item.name}:${variant}`"
          :fallback="`${variant}: N/A`"
        />
      </div>

      <!-- 操作按钮:紧凑单行布局 -->
      <ButtonGroup class="mt-auto w-full">
        <Button
          variant="outline"
          size="sm"
          as="a"
          :href="`https://hub.docker.com/r/aliuq/${item.name}`"
          target="_blank"
          rel="noreferrer"
          :aria-label="`View ${item.name} on Docker Hub`"
          class="flex-1 text-xs px-2"
        >
          <LucidePackage class="size-3.5" />
          <span class="hidden sm:inline">Docker Hub</span>
        </Button>
        <Button
          v-if="item.sourceUrl"
          variant="outline"
          size="sm"
          as="a"
          :href="item.sourceUrl"
          target="_blank"
          rel="noreferrer"
          :aria-label="`View ${item.name} source code`"
          class="flex-1 text-xs px-2"
        >
          <LucideGithub class="size-3.5" />
          <span class="hidden sm:inline">Source</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          as="a"
          :href="item.docUrl"
          target="_blank"
          rel="noreferrer"
          :aria-label="`View ${item.name} documentation`"
          class="flex-1 text-xs px-2"
        >
          <LucideBookOpen class="size-3.5" />
          <span class="hidden sm:inline">Readme</span>
        </Button>
        <Button
          v-if="item.ghcrUrl"
          variant="outline"
          size="sm"
          as="a"
          :href="item.ghcrUrl"
          target="_blank"
          rel="noreferrer"
          :aria-label="`View ${item.name} on GitHub Container Registry`"
          class="flex-1 text-xs px-2"
        >
          GHCR
        </Button>
      </ButtonGroup>
    </CardContent>
  </Card>
</template>
