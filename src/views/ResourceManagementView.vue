<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getResourceCatalog } from '../api/modules/resources'
import type { ResourceCatalog } from '../types/domain'

const props = defineProps<{ section: 'amrs' | 'devices' }>()
const router = useRouter()
const catalog = ref<ResourceCatalog | null>(null)
const loading = ref(true)
const query = ref('')
const meta = computed(() => props.section === 'amrs'
  ? { eyebrow: 'AMR ASSETS', title: 'AMR 管理', description: '管理车辆状态、网络连接与服务设备关系。', action: '新增 AMR' }
  : { eyebrow: 'DEVICE ASSETS', title: '设备管理', description: '管理生产设备、绑定点位与服务车辆关系。', action: '新增设备' })
const includesQuery = (values: unknown[]) => values.join(' ').toLowerCase().includes(query.value.trim().toLowerCase())
const amrs = computed(() => (catalog.value?.amrs ?? []).filter((item) => includesQuery([item.id, item.name, item.ip, item.model])))
const devices = computed(() => (catalog.value?.devices ?? []).filter((item) => includesQuery([item.id, item.label, item.name, item.group])))
const serviceAmrs = (deviceId: string) => catalog.value?.amrs.filter((item) => item.serviceDevices.includes(deviceId)).map((item) => item.id) ?? []
const servicePreview = (ids: string[]) => ids.slice(0, 4)

onMounted(async () => {
  try { catalog.value = await getResourceCatalog() } finally { loading.value = false }
})
</script>

<template>
  <section class="resource-page">
    <header class="resource-page__header">
      <div><p class="page-eyebrow">{{ meta.eyebrow }}</p><h1>{{ meta.title }}</h1><p>{{ meta.description }}</p></div>
      <button class="resource-primary-action" type="button">＋ {{ meta.action }}</button>
    </header>
    <div class="resource-toolbar">
      <label><span>⌕</span><input v-model="query" :placeholder="`搜索${meta.title.replace('管理', '')}编号或名称`"></label>
    </div>
    <div v-if="loading" class="resource-loading">正在读取资源数据</div>
    <div v-else class="resource-table-wrap">
      <table v-if="section === 'amrs'" class="resource-table">
        <thead><tr><th>AMR 编号</th><th>名称</th><th>IP 地址</th><th>型号</th><th>服务设备</th><th>运行状态</th><th>电量</th><th>操作</th></tr></thead>
        <tbody><tr v-for="item in amrs" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.name }}</strong><small>{{ item.initialPoint }}</small></td><td class="type-data">{{ item.ip }}</td><td>{{ item.model }}</td><td><div class="resource-chip-list"><i v-for="id in servicePreview(item.serviceDevices)" :key="id">{{ id }}</i><i v-if="item.serviceDevices.length > 4" class="resource-chip-more">+{{ item.serviceDevices.length - 4 }}</i></div></td><td><span class="asset-status" :class="item.tone">{{ item.status }}</span></td><td class="type-data">{{ item.battery }}%</td><td><button class="table-action" @click="router.push(`/resources/amrs/${item.id}`)">查看</button></td></tr></tbody>
      </table>
      <table v-else class="resource-table">
        <thead><tr><th>设备编号</th><th>设备名称</th><th>类型</th><th>连接状态</th><th>绑定点位</th><th>设备组</th><th>服务 AMR</th><th>操作</th></tr></thead>
        <tbody><tr v-for="item in devices" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.name || item.label }}</strong></td><td>{{ item.type }}</td><td><span class="asset-status" :class="item.connected === false ? 'offline' : 'success'">{{ item.connected === false ? '离线' : '在线' }}</span></td><td class="resource-link">{{ item.boundPoint || '—' }}</td><td>{{ item.group || '—' }}</td><td><div class="resource-chip-list"><i v-for="id in serviceAmrs(item.id)" :key="id">{{ id }}</i></div></td><td><button class="table-action" @click="router.push(`/resources/devices/${item.id}`)">查看</button></td></tr></tbody>
      </table>
    </div>
  </section>
</template>
