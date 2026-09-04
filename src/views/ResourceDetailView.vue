<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getResourceCatalog } from '../api/modules/resources'
import type { ResourceCatalog } from '../types/domain'

const props = defineProps<{ kind: 'amr' | 'device' }>()
const route = useRoute()
const router = useRouter()
const catalog = ref<ResourceCatalog | null>(null)
const item = computed(() => props.kind === 'amr' ? catalog.value?.amrs.find((entry) => entry.id === route.params.id) : catalog.value?.devices.find((entry) => entry.id === route.params.id))
const serviceAmrs = computed(() => props.kind === 'device' ? catalog.value?.amrs.filter((amr) => amr.serviceDevices.includes(route.params.id as string)) ?? [] : [])
const displayName = computed(() => {
  const resource = item.value
  if (!resource) return ''
  return 'ip' in resource ? resource.name : resource.name || resource.label
})
onMounted(async () => { catalog.value = await getResourceCatalog() })
</script>

<template>
  <section v-if="item" class="resource-page detail-page">
    <header class="resource-page__header resource-detail-header"><div><button class="back-link" @click="router.back()">← 返回{{ kind === 'amr' ? ' AMR 管理' : '设备管理' }}</button><p class="page-eyebrow">RESOURCE DETAIL</p><h1>{{ item.id }}</h1><p>{{ displayName }}</p></div><button class="resource-primary-action">编辑服务关系</button></header>
    <template v-if="kind === 'amr' && 'ip' in item">
      <div class="resource-detail-layout">
        <section class="detail-panel detail-panel--primary"><header><span>AMR 信息</span><small>资料来源：设备台账</small></header><dl class="detail-grid"><div><dt>名称</dt><dd>{{ item.name }}</dd></div><div><dt>IP 地址</dt><dd class="type-data">{{ item.ip }}</dd></div><div><dt>所属型号</dt><dd>{{ item.model }}</dd></div><div><dt>底盘类型</dt><dd>{{ item.chassis }}</dd></div><div><dt>初始点位</dt><dd>{{ item.initialPoint }}</dd></div><div><dt>额定载荷</dt><dd>{{ item.ratedLoad }}</dd></div><div><dt>运行状态</dt><dd><span class="asset-status" :class="item.tone">{{ item.status }}</span></dd></div><div><dt>当前电量</dt><dd>{{ item.battery }}%</dd></div></dl></section>
        <section class="detail-panel detail-panel--relations"><header><span>服务设备</span><b>{{ item.serviceDevices.length }}</b></header><div class="scope-detail"><div><span>当前服务范围</span><p><i v-for="id in item.serviceDevices" :key="id">{{ id }}</i></p></div></div></section>
      </div>
    </template>
    <template v-else-if="'type' in item">
      <div class="resource-detail-layout">
        <section class="detail-panel detail-panel--primary"><header><span>设备信息</span><small>资料来源：设备台账</small></header><dl class="detail-grid"><div><dt>设备名称</dt><dd>{{ item.name || item.label }}</dd></div><div><dt>设备类型</dt><dd>{{ item.type }}</dd></div><div><dt>设备组</dt><dd>{{ item.group || '—' }}</dd></div><div><dt>绑定点位</dt><dd>{{ item.boundPoint || '—' }}</dd></div><div><dt>启用状态</dt><dd>{{ item.enabled === false ? '停用' : '启用' }}</dd></div><div><dt>连接状态</dt><dd>{{ item.connected === false ? '离线' : '在线' }}</dd></div></dl></section>
        <section class="detail-panel detail-panel--relations"><header><span>服务 AMR</span><b>{{ serviceAmrs.length }}</b></header><div class="scope-detail"><div><span>已建立服务关系</span><p><i v-for="amr in serviceAmrs" :key="amr.id">{{ amr.id }}</i></p></div></div></section>
      </div>
    </template>
  </section>
</template>
