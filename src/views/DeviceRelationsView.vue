<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { getResourceCatalog } from '../api/modules/resources'
import type { Amr, MapResource } from '../types/domain'

const loading = ref(true)
const amrs = ref<Amr[]>([])
const devices = ref<MapResource[]>([])
const query = ref('')
const currentPage = ref(1)
const pageSize = 10
const relationOpen = ref(false)
const selectedAmrId = ref('')
const amrPickerQuery = ref('')
const deviceQuery = ref('')
const selectedType = ref('全部设备')
const selectedDeviceIds = ref<string[]>([])
const savedDeviceIds = ref<string[]>([])
const selectAllRef = ref<HTMLInputElement | null>(null)

const selectedAmr = computed(() => amrs.value.find((item) => item.id === selectedAmrId.value))
const deviceIndex = computed(() => new Map(devices.value.map((item) => [item.id, item])))
const deviceTypeLabel = (item: MapResource) => item.type === 'machine' ? '一拖二机械臂' : '辅助设备'
const deviceIp = (item: MapResource) => `10.197.138.${41 + devices.value.indexOf(item)}`
const relatedDevices = (amr: Amr) => amr.serviceDevices.map((id) => deviceIndex.value.get(id)).filter((item): item is MapResource => Boolean(item))

const filteredAmrs = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return amrs.value
  return amrs.value.filter((amr) => {
    const relations = relatedDevices(amr).flatMap((item) => [item.id, item.name || item.label, deviceIp(item)])
    return [amr.id, amr.name, amr.ip, ...relations].join(' ').toLowerCase().includes(keyword)
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredAmrs.value.length / pageSize)))
const paginatedAmrs = computed(() => filteredAmrs.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const paginationItems = computed<(number | string)[]>(() => {
  const total = pageCount.value
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = [...new Set([1, total, currentPage.value - 1, currentPage.value, currentPage.value + 1])].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const result: (number | string)[] = []
  pages.forEach((page, index) => { if (index && page - pages[index - 1]! > 1) result.push(`ellipsis-${page}`); result.push(page) })
  return result
})

const matchedAmrs = computed(() => {
  const keyword = amrPickerQuery.value.trim().toLowerCase()
  if (!keyword) return amrs.value
  return amrs.value.filter((item) => [item.id, item.name, item.ip].join(' ').toLowerCase().includes(keyword))
})
const filteredDevices = computed(() => {
  const keyword = deviceQuery.value.trim().toLowerCase()
  return devices.value.filter((item) => {
    const type = deviceTypeLabel(item)
    return (selectedType.value === '全部设备' || selectedType.value === type)
      && (!keyword || [item.id, item.name || item.label, deviceIp(item)].join(' ').toLowerCase().includes(keyword))
  })
})
const allFilteredSelected = computed(() => filteredDevices.value.length > 0 && filteredDevices.value.every((item) => selectedDeviceIds.value.includes(item.id)))
const someFilteredSelected = computed(() => filteredDevices.value.some((item) => selectedDeviceIds.value.includes(item.id)) && !allFilteredSelected.value)
const addedCount = computed(() => selectedDeviceIds.value.filter((id) => !savedDeviceIds.value.includes(id)).length)
const removedCount = computed(() => savedDeviceIds.value.filter((id) => !selectedDeviceIds.value.includes(id)).length)
const hasChanges = computed(() => addedCount.value > 0 || removedCount.value > 0)

function openRelation(amr?: Amr) {
  const target = amr ?? amrs.value[0]
  if (!target) return
  relationOpen.value = true
  selectAmr(target.id)
}
function selectAmr(id: string) {
  selectedAmrId.value = id
  const relations = amrs.value.find((item) => item.id === id)?.serviceDevices ?? []
  savedDeviceIds.value = [...relations]
  selectedDeviceIds.value = [...relations]
  deviceQuery.value = ''
  selectedType.value = '全部设备'
  amrPickerQuery.value = ''
}
function toggleAllFiltered() {
  const ids = filteredDevices.value.map((item) => item.id)
  selectedDeviceIds.value = allFilteredSelected.value ? selectedDeviceIds.value.filter((id) => !ids.includes(id)) : [...new Set([...selectedDeviceIds.value, ...ids])]
}
function saveRelations() {
  if (!selectedAmr.value) return
  selectedAmr.value.serviceDevices = [...selectedDeviceIds.value]
  savedDeviceIds.value = [...selectedDeviceIds.value]
  relationOpen.value = false
}

watch(query, () => { currentPage.value = 1 })
watch(pageCount, (count) => { if (currentPage.value > count) currentPage.value = count })
watchEffect(() => { if (selectAllRef.value) selectAllRef.value.indeterminate = someFilteredSelected.value })
onMounted(async () => { try { const catalog = await getResourceCatalog(); amrs.value = catalog.amrs; devices.value = catalog.devices } finally { loading.value = false } })
</script>

<template>
  <section class="resource-page relation-overview-page">
    <header class="resource-page__header"><div><p class="page-eyebrow">DEVICE RELATIONS</p><h1>设备关联管理</h1></div><button class="resource-primary-action" type="button" @click="openRelation()">＋ 设置关联关系</button></header>

    <div class="resource-toolbar relation-overview-toolbar"><label><span>⌕</span><input v-model="query" placeholder="搜索设备 SN、设备名称、IP 或关联设备"></label><b>{{ filteredAmrs.length }} 台 AMR</b></div>
    <div v-if="loading" class="resource-loading">正在读取设备关联</div>
    <div v-else class="resource-table-wrap relation-overview-table-wrap">
      <table class="resource-table relation-overview-table">
        <colgroup><col class="col-amr-sn"><col class="col-amr-name"><col class="col-amr-ip"><col class="col-devices"><col class="col-count"><col class="col-action"></colgroup>
        <thead><tr><th>设备 SN</th><th>设备名称</th><th>IP</th><th>关联设备</th><th>关联数量</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="amr in paginatedAmrs" :key="amr.id"><td class="resource-id type-data">{{ amr.id }}</td><td class="relation-device-name" :title="amr.name"><strong>{{ amr.name }}</strong></td><td class="type-data relation-device-ip">{{ amr.ip }}</td><td><div v-if="relatedDevices(amr).length" class="relation-device-chips"><span v-for="device in relatedDevices(amr).slice(0, 4)" :key="device.id" :title="`${device.name || device.label} · ${deviceIp(device)}`">{{ device.name || device.label }}</span><em v-if="relatedDevices(amr).length > 4">+{{ relatedDevices(amr).length - 4 }}</em></div><span v-else class="relation-none">尚未关联</span></td><td><b class="relation-count">{{ relatedDevices(amr).length }}</b></td><td><button class="table-action" type="button" @click="openRelation(amr)">设置关联</button></td></tr>
          <tr v-if="filteredAmrs.length === 0"><td colspan="6" class="device-empty">没有符合条件的关联关系</td></tr>
        </tbody>
      </table>
    </div>
    <footer v-if="!loading" class="task-pagination device-ledger-pagination"><span>共 {{ filteredAmrs.length }} 条 · 每页 {{ pageSize }} 条</span><nav><button :disabled="currentPage === 1" @click="currentPage--">‹</button><template v-for="item in paginationItems" :key="item"><button v-if="typeof item === 'number'" :class="{ active: currentPage === item }" @click="currentPage = item">{{ item }}</button><span v-else class="device-pagination-ellipsis">…</span></template><button :disabled="currentPage === pageCount" @click="currentPage++">›</button></nav></footer>

    <div v-if="relationOpen" class="modal-backdrop" @click.self="relationOpen = false">
      <section class="create-dialog relation-setting-dialog">
        <header><div><span>EDIT RELATIONS</span><strong>设置设备关联关系</strong><small>选择 AMR，并配置该 AMR 可以服务的设备</small></div><button aria-label="关闭" @click="relationOpen = false">×</button></header>
        <div class="relation-setting-layout">
          <aside class="relation-amr-list"><label class="relation-search-field"><span aria-hidden="true">⌕</span><input v-model="amrPickerQuery" type="search" aria-label="筛选 AMR" placeholder="输入 AMR 名称、SN 或 IP"></label><div><button v-for="amr in matchedAmrs" :key="amr.id" type="button" :class="{ active: selectedAmrId === amr.id }" @click="selectAmr(amr.id)"><strong>{{ amr.name }}</strong><small>{{ amr.id }} · {{ amr.ip }}</small></button></div></aside>
          <main class="relation-device-selector"><div class="relation-selected-amr"><span>当前 AMR</span><strong>{{ selectedAmr?.name }}</strong><small>设备 SN：{{ selectedAmr?.id }} · IP：{{ selectedAmr?.ip }}</small></div><div class="relation-modal-toolbar"><label class="relation-search-field"><span aria-hidden="true">⌕</span><input v-model="deviceQuery" type="search" aria-label="筛选设备" placeholder="按设备名称或 IP 模糊筛选"></label><select v-model="selectedType" aria-label="筛选设备类型"><option>全部设备</option><option>一拖二机械臂</option><option>辅助设备</option></select></div><div class="relation-select-all"><label><input ref="selectAllRef" type="checkbox" :checked="allFilteredSelected" @change="toggleAllFiltered"><span>选择当前筛选结果</span></label><b>已选择 {{ selectedDeviceIds.length }} 台</b></div><div class="relation-modal-devices"><label v-for="device in filteredDevices" :key="device.id" :class="{ selected: selectedDeviceIds.includes(device.id) }"><input v-model="selectedDeviceIds" type="checkbox" :value="device.id"><span><strong>{{ device.name || device.label }}</strong><small>设备 SN：{{ device.id }} · IP：{{ deviceIp(device) }}</small></span><em>{{ deviceTypeLabel(device) }}</em></label></div></main>
        </div>
        <footer><span class="relation-dialog-change">{{ hasChanges ? `新增 ${addedCount} 项，解除 ${removedCount} 项` : '关联关系没有变化' }}</span><button type="button" @click="relationOpen = false">取消</button><button class="primary" type="button" :disabled="!hasChanges" @click="saveRelations">保存关联</button></footer>
      </section>
    </div>
  </section>
</template>
