<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { getResourceCatalog } from '../api/modules/resources'
import type { Amr, MapResource } from '../types/domain'

const loading = ref(true)
const amrs = ref<Amr[]>([])
const devices = ref<MapResource[]>([])
const querySn = ref('')
const queryName = ref('')
const queryType = ref('')
const appliedOverviewQuery = ref({ sn: '', name: '', type: '' })
const currentPage = ref(1)
const pageSize = 10
const relationOpen = ref(false)
const relationExcelOpen = ref(false)
const relationExcelFileName = ref('')
const relationExcelReady = ref(false)
const selectedAmrId = ref('')
const amrPickerQuery = ref('')
const appliedAmrPickerQuery = ref('')
const deviceSnQuery = ref('')
const deviceNameQuery = ref('')
const deviceTypeQuery = ref('')
const appliedDeviceQuery = ref({ sn: '', name: '', type: '' })
const selectedDeviceIds = ref<string[]>([])
const savedDeviceIds = ref<string[]>([])
const selectAllRef = ref<HTMLInputElement | null>(null)

const selectedAmr = computed(() => amrs.value.find((item) => item.id === selectedAmrId.value))
const deviceIndex = computed(() => new Map(devices.value.map((item) => [item.id, item])))
const deviceTypeLabel = (_item: MapResource) => '上下料'
const deviceIp = (item: MapResource) => `10.197.138.${41 + devices.value.indexOf(item)}`
const relatedDevices = (amr: Amr) => amr.serviceDevices.map((id) => deviceIndex.value.get(id)).filter((item): item is MapResource => Boolean(item))
const amrSn = (amr: Amr) => `SN-AMR-${String(amrs.value.indexOf(amr) + 1).padStart(4, '0')}`
const amrSite = () => 'GL-C06-4F'

const filteredAmrs = computed(() => {
  const sn = appliedOverviewQuery.value.sn.toLowerCase()
  const name = appliedOverviewQuery.value.name.toLowerCase()
  const type = appliedOverviewQuery.value.type.toLowerCase()
  return amrs.value.filter((amr) => {
    return (!type || '复合机器人'.includes(type)) && (!sn || amrSn(amr).toLowerCase().includes(sn))
      && (!name || amr.name.toLowerCase().includes(name))
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
  const keyword = appliedAmrPickerQuery.value.toLowerCase()
  if (!keyword) return amrs.value
  return amrs.value.filter((item) => item.name.toLowerCase().includes(keyword))
})
const filteredDevices = computed(() => {
  const sn = appliedDeviceQuery.value.sn.toLowerCase()
  const name = appliedDeviceQuery.value.name.toLowerCase()
  const type = appliedDeviceQuery.value.type.toLowerCase()
  return devices.value.filter((item) => {
    return (!sn || item.id.toLowerCase().includes(sn))
      && (!name || (item.name || item.label).toLowerCase().includes(name))
      && (!type || deviceTypeLabel(item).toLowerCase().includes(type))
  })
})
const allFilteredSelected = computed(() => filteredDevices.value.length > 0 && filteredDevices.value.every((item) => selectedDeviceIds.value.includes(item.id)))
const someFilteredSelected = computed(() => filteredDevices.value.some((item) => selectedDeviceIds.value.includes(item.id)) && !allFilteredSelected.value)
const addedCount = computed(() => selectedDeviceIds.value.filter((id) => !savedDeviceIds.value.includes(id)).length)
const removedCount = computed(() => savedDeviceIds.value.filter((id) => !selectedDeviceIds.value.includes(id)).length)
const hasChanges = computed(() => addedCount.value > 0 || removedCount.value > 0)
const relationExcelPreview = computed(() => {
  const rows: { amrId: string; amrSn: string; amrName: string; deviceId: string; deviceName: string }[] = []
  ;[[0, 0], [0, 1], [1, 2], [2, 3]].forEach(([amrIndex, deviceIndexValue]) => {
    const amr = amrs.value[amrIndex!]
    const device = devices.value[deviceIndexValue!]
    if (amr && device) rows.push({ amrId: amr.id, amrSn: amrSn(amr), amrName: amr.name, deviceId: device.id, deviceName: device.name || device.label })
  })
  return rows
})

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
  deviceSnQuery.value = ''; deviceNameQuery.value = ''; deviceTypeQuery.value = ''
  appliedDeviceQuery.value = { sn: '', name: '', type: '' }
  amrPickerQuery.value = ''
  appliedAmrPickerQuery.value = ''
}
function searchOverview() { appliedOverviewQuery.value = { sn: querySn.value.trim(), name: queryName.value.trim(), type: queryType.value.trim() }; currentPage.value = 1 }
function searchAmrs() { appliedAmrPickerQuery.value = amrPickerQuery.value.trim() }
function searchRelationDevices() { appliedDeviceQuery.value = { sn: deviceSnQuery.value.trim(), name: deviceNameQuery.value.trim(), type: deviceTypeQuery.value.trim() } }
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
function openRelationExcel() {
  relationExcelFileName.value = ''; relationExcelReady.value = false; relationExcelOpen.value = true
}
function chooseRelationExcel(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  relationExcelFileName.value = file.name
  relationExcelReady.value = true
}
function importRelationsFromExcel() {
  relationExcelPreview.value.forEach((row) => {
    const amr = amrs.value.find((item) => item.id === row.amrId)
    if (amr && !amr.serviceDevices.includes(row.deviceId)) amr.serviceDevices = [...amr.serviceDevices, row.deviceId]
  })
  relationExcelOpen.value = false
}

watch(pageCount, (count) => { if (currentPage.value > count) currentPage.value = count })
watchEffect(() => { if (selectAllRef.value) selectAllRef.value.indeterminate = someFilteredSelected.value })
onMounted(async () => { try { const catalog = await getResourceCatalog(); amrs.value = catalog.amrs; devices.value = catalog.devices } finally { loading.value = false } })
</script>

<template>
  <section class="resource-page relation-overview-page">
    <header class="resource-page__header"><div><p class="page-eyebrow">DEVICE RELATIONS</p><h1>设备关联管理</h1></div><div class="device-header-actions"><button class="device-secondary-action device-action-outline" type="button" @click="openRelationExcel">⇧ Excel 导入</button><button class="resource-primary-action" type="button" @click="openRelation()">＋ 关联设备</button></div></header>

    <div class="resource-toolbar relation-overview-toolbar"><div class="relation-overview-searches"><label><span>⌕</span><input v-model="querySn" placeholder="设备 SN"></label><label><span>⌕</span><input v-model="queryName" placeholder="设备名称"></label><label><span>⌕</span><input v-model="queryType" placeholder="设备类型" @keyup.enter="searchOverview"></label></div><button class="device-query-button" type="button" @click="searchOverview">查询</button></div>
    <div v-if="loading" class="resource-loading">正在读取设备关联</div>
    <div v-else class="resource-table-wrap relation-overview-table-wrap">
      <table class="resource-table relation-overview-table">
        <colgroup><col class="col-amr-sn"><col class="col-amr-name"><col class="col-amr-type"><col class="col-location"><col class="col-devices"><col class="col-action"></colgroup>
        <thead><tr><th>设备 SN</th><th>设备名称</th><th>设备类型</th><th>厂区 / 楼栋 / 楼层</th><th>关联设备</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="amr in paginatedAmrs" :key="amr.id">
            <td class="resource-id type-data">{{ amrSn(amr) }}</td>
            <td class="relation-device-name" :title="amr.name"><strong>{{ amr.name }}</strong></td>
            <td><span class="device-type-tag amr">复合机器人</span></td>
            <td>{{ amrSite() }}</td>
            <td><div v-if="relatedDevices(amr).length" class="relation-device-chips"><span v-for="device in relatedDevices(amr).slice(0, 4)" :key="device.id" :title="`${device.name || device.label} · ${deviceIp(device)}`">{{ device.name || device.label }}</span><em v-if="relatedDevices(amr).length > 4">+{{ relatedDevices(amr).length - 4 }}</em></div><span v-else class="relation-none">尚未关联</span></td><td><button class="table-action" type="button" @click="openRelation(amr)">编辑</button></td>
          </tr>
          <tr v-if="filteredAmrs.length === 0"><td colspan="6" class="device-empty">没有符合条件的关联关系</td></tr>
        </tbody>
      </table>
    </div>
    <footer v-if="!loading" class="task-pagination device-ledger-pagination"><span>共 {{ filteredAmrs.length }} 条 · 每页 {{ pageSize }} 条</span><nav><button :disabled="currentPage === 1" @click="currentPage--">‹</button><template v-for="item in paginationItems" :key="item"><button v-if="typeof item === 'number'" :class="{ active: currentPage === item }" @click="currentPage = item">{{ item }}</button><span v-else class="device-pagination-ellipsis">…</span></template><button :disabled="currentPage === pageCount" @click="currentPage++">›</button></nav></footer>

    <div v-if="relationExcelOpen" class="modal-backdrop" @click.self="relationExcelOpen = false">
      <section class="create-dialog excel-import-dialog relation-excel-dialog">
        <header><div><span>RELATION EXCEL IMPORT</span><strong>Excel 导入设备关联</strong><small>批量预览 AMR 与服务设备的关联关系</small></div><button aria-label="关闭" @click="relationExcelOpen = false">×</button></header>
        <div class="excel-import-body">
          <label class="excel-dropzone"><input type="file" accept=".xlsx,.xls" @change="chooseRelationExcel"><b>⇧</b><strong>{{ relationExcelFileName || '选择关联关系 Excel 文件' }}</strong><span>字段：AMR 设备 SN、AMR 名称、关联设备 SN、关联设备名称</span></label>
          <div v-if="relationExcelReady" class="excel-summary"><span><b>{{ relationExcelPreview.length }}</b> 条关系</span><span><b>{{ relationExcelPreview.length }}</b> 条可导入</span><span><b>0</b> 条异常</span></div>
          <div v-if="relationExcelReady" class="excel-preview"><table><thead><tr><th>AMR 设备 SN</th><th>AMR 名称</th><th>关联设备 SN</th><th>关联设备名称</th><th>结果</th></tr></thead><tbody><tr v-for="row in relationExcelPreview" :key="`${row.amrId}-${row.deviceId}`"><td class="type-data">{{ row.amrSn }}</td><td>{{ row.amrName }}</td><td class="type-data">{{ row.deviceId }}</td><td>{{ row.deviceName }}</td><td><em>新增关联</em></td></tr></tbody></table></div>
          <div v-else class="excel-empty"><strong>尚未选择文件</strong><span>选择文件后将在这里展示关联关系预览。</span></div>
        </div>
        <footer><button type="button" @click="relationExcelOpen = false">取消</button><button class="primary" type="button" :disabled="!relationExcelReady" @click="importRelationsFromExcel">确认导入（{{ relationExcelReady ? relationExcelPreview.length : 0 }}）</button></footer>
      </section>
    </div>

    <div v-if="relationOpen" class="modal-backdrop" @click.self="relationOpen = false">
      <section class="create-dialog relation-setting-dialog">
        <header><div><span>EDIT RELATIONS</span><strong>设置设备关联关系</strong><small>选择 AMR，并配置该 AMR 可以服务的设备</small></div><button aria-label="关闭" @click="relationOpen = false">×</button></header>
        <div class="relation-setting-layout">
          <aside class="relation-amr-list"><div class="relation-amr-query"><label class="relation-search-field"><span aria-hidden="true">⌕</span><input v-model="amrPickerQuery" type="search" aria-label="按名称筛选 AMR" placeholder="AMR 名称" @keyup.enter="searchAmrs"></label><button type="button" @click="searchAmrs">查询</button></div><div><button v-for="amr in matchedAmrs" :key="amr.id" type="button" :class="{ active: selectedAmrId === amr.id }" @click="selectAmr(amr.id)"><strong>{{ amr.name }}</strong><small>{{ amrSn(amr) }} · {{ amr.ip }}</small></button></div></aside>
          <main class="relation-device-selector"><div class="relation-selected-amr"><span>当前 AMR</span><strong>{{ selectedAmr?.name }}</strong><small>设备 SN：{{ selectedAmr?.id }} · IP：{{ selectedAmr?.ip }}</small></div><div class="relation-modal-toolbar relation-modal-toolbar--split"><label class="relation-search-field"><span aria-hidden="true">⌕</span><input v-model="deviceSnQuery" type="search" placeholder="设备 SN"></label><label class="relation-search-field"><span aria-hidden="true">⌕</span><input v-model="deviceNameQuery" type="search" placeholder="设备名称"></label><label class="relation-search-field"><span aria-hidden="true">⌕</span><input v-model="deviceTypeQuery" type="search" placeholder="设备类型" @keyup.enter="searchRelationDevices"></label><button type="button" @click="searchRelationDevices">查询</button></div><div class="relation-select-all"><label><input ref="selectAllRef" type="checkbox" :checked="allFilteredSelected" @change="toggleAllFiltered"><span>选择当前筛选结果</span></label><b>已选择 {{ selectedDeviceIds.length }} 台</b></div><div class="relation-modal-devices"><label v-for="device in filteredDevices" :key="device.id" :class="{ selected: selectedDeviceIds.includes(device.id) }"><input v-model="selectedDeviceIds" type="checkbox" :value="device.id"><span><strong>{{ device.name || device.label }}</strong><small>设备 SN：{{ device.id }} · IP：{{ deviceIp(device) }}</small></span><em>{{ deviceTypeLabel(device) }}</em></label></div></main>
        </div>
        <footer><span class="relation-dialog-change">{{ hasChanges ? `新增 ${addedCount} 项，解除 ${removedCount} 项` : '关联关系没有变化' }}</span><button type="button" @click="relationOpen = false">取消</button><button class="primary" type="button" :disabled="!hasChanges" @click="saveRelations">保存关联</button></footer>
      </section>
    </div>
  </section>
</template>
