<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, watchEffect } from 'vue'
import { getResourceCatalog } from '../api/modules/resources'

type DeviceType = '复合机器人' | '上下料'
type DeviceSource = '设备台账' | '维保系统' | '手动录入'
type DeviceRow = { sn: string; name: string; vendor: string; ip: string; type: DeviceType; site: string; updatedAt: string; source: DeviceSource }

const loading = ref(true)
const deviceRows = ref<DeviceRow[]>([])
const querySn = ref('')
const queryName = ref('')
const queryVendor = ref('')
const queryIp = ref('')
const queryType = ref('')
const appliedQuery = reactive({ sn: '', name: '', vendor: '', ip: '', type: '' })
const selectedSns = ref<string[]>([])
const selectAllRef = ref<HTMLInputElement | null>(null)
const currentPage = ref(1)
const pageSize = 10
const editorOpen = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorError = ref('')
const importOpen = ref(false)
const selectedImportSns = ref<string[]>([])
const importMessage = ref('')
const lastPulledAt = ref('2026-09-06 18:30')
const pulledCandidates = ref<(DeviceRow & { action: '新增' | '更新' })[]>([])

const emptyForm = (): DeviceRow => ({ sn: '', name: '', vendor: '', ip: '', type: '复合机器人', site: 'GL-C06-4F', updatedAt: '2026-09-07 10:00', source: '手动录入' })
const form = reactive<DeviceRow>(emptyForm())

const incrementalCandidates = computed<(DeviceRow & { action: '新增' | '更新' })[]>(() => [
  { sn: 'SN-AMR-0001', name: '一号线搬运车 01', vendor: '仙工智能', ip: '10.197.137.31', type: '复合机器人', site: 'GL-C06-4F', updatedAt: '2026-09-07 10:16', source: '维保系统', action: '更新' },
  { sn: 'SN-AMR-0009', name: '备用搬运车 04', vendor: '海康机器人', ip: '10.197.137.39', type: '复合机器人', site: 'GL-C06-4F', updatedAt: '2026-09-07 10:12', source: '设备台账', action: '新增' },
  { sn: 'SN-ARM-C20-121', name: 'C20 一拖二机械手臂', vendor: '新松机器人', ip: '10.197.138.121', type: '上下料', site: 'GL-C06-4F', updatedAt: '2026-09-07 09:58', source: '设备台账', action: '新增' },
  { sn: 'SN-AUX-D-03', name: '自动门 D-03', vendor: '厂务自动化', ip: '10.197.138.122', type: '上下料', site: 'GL-C06-4F', updatedAt: '2026-09-07 09:44', source: '维保系统', action: '新增' },
])

const filteredRows = computed(() => {
  const sn = appliedQuery.sn.toLowerCase()
  const name = appliedQuery.name.toLowerCase()
  const vendor = appliedQuery.vendor.toLowerCase()
  const ip = appliedQuery.ip.toLowerCase()
  const type = appliedQuery.type.toLowerCase()
  return deviceRows.value.filter((item) => {
    return (!sn || item.sn.toLowerCase().includes(sn))
      && (!name || item.name.toLowerCase().includes(name))
      && (!vendor || item.vendor.toLowerCase().includes(vendor))
      && (!ip || item.ip.toLowerCase().includes(ip))
      && (!type || item.type.toLowerCase().includes(type))
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))
const paginatedRows = computed(() => filteredRows.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const paginationItems = computed<(number | string)[]>(() => {
  const total = pageCount.value
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, currentPage.value - 1, currentPage.value, currentPage.value + 1])
  const visible = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const items: (number | string)[] = []
  visible.forEach((page, index) => {
    if (index > 0 && page - visible[index - 1]! > 1) items.push(`ellipsis-${page}`)
    items.push(page)
  })
  return items
})
const allVisibleSelected = computed(() => paginatedRows.value.length > 0 && paginatedRows.value.every((item) => selectedSns.value.includes(item.sn)))
const someVisibleSelected = computed(() => paginatedRows.value.some((item) => selectedSns.value.includes(item.sn)) && !allVisibleSelected.value)

function toggleAllVisible() {
  const visibleSns = paginatedRows.value.map((item) => item.sn)
  selectedSns.value = allVisibleSelected.value ? selectedSns.value.filter((sn) => !visibleSns.includes(sn)) : [...new Set([...selectedSns.value, ...visibleSns])]
}
function searchDevices() {
  Object.assign(appliedQuery, { sn: querySn.value.trim(), name: queryName.value.trim(), vendor: queryVendor.value.trim(), ip: queryIp.value.trim(), type: queryType.value.trim() })
  currentPage.value = 1
}
function openCreate() {
  editorMode.value = 'create'; editorError.value = ''; Object.assign(form, emptyForm()); editorOpen.value = true
}
function openEdit(item: DeviceRow) {
  editorMode.value = 'edit'; editorError.value = ''; Object.assign(form, item); editorOpen.value = true
}
function saveDevice() {
  editorError.value = ''
  if (!form.sn.trim() || !form.name.trim() || !form.vendor.trim() || !form.ip.trim() || !form.site.trim()) { editorError.value = '请填写所有设备字段。'; return }
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(form.ip)) { editorError.value = 'IP 地址格式不正确，请输入 IPv4 地址。'; return }
  const index = deviceRows.value.findIndex((item) => item.sn === form.sn)
  if (editorMode.value === 'create' && index >= 0) { editorError.value = `设备 SN ${form.sn} 已存在，请确认设备资料。`; return }
  const saved = { ...form, source: editorMode.value === 'create' ? '手动录入' as const : form.source }
  if (index >= 0) deviceRows.value[index] = saved
  else deviceRows.value.unshift(saved)
  editorOpen.value = false
}
function openImport() {
  selectedImportSns.value = []; pulledCandidates.value = []; importMessage.value = ''; importOpen.value = true
}
function pullLatestDevices() {
  if (selectedSns.value.length) {
    pulledCandidates.value = deviceRows.value.filter((item) => selectedSns.value.includes(item.sn)).map((item, index) => ({ ...item, updatedAt: `2026-09-07 10:${String(24 + index).padStart(2, '0')}`, source: index % 2 ? '维保系统' : '设备台账', action: '更新' }))
  } else pulledCandidates.value = incrementalCandidates.value
  selectedImportSns.value = pulledCandidates.value.map((item) => item.sn)
  importMessage.value = ''
}
function writeImportedDevices() {
  const selected = pulledCandidates.value.filter((item) => selectedImportSns.value.includes(item.sn))
  selected.forEach(({ action: _action, ...item }) => {
    const index = deviceRows.value.findIndex((existing) => existing.sn === item.sn)
    if (index >= 0) deviceRows.value[index] = item
    else deviceRows.value.unshift(item)
  })
  lastPulledAt.value = '2026-09-07 10:20'
  importMessage.value = `已写入 ${selected.length} 台设备，其中新增 ${selected.filter((item) => item.action === '新增').length} 台、更新 ${selected.filter((item) => item.action === '更新').length} 台。`
  selectedImportSns.value = []
}

watchEffect(() => { if (selectAllRef.value) selectAllRef.value.indeterminate = someVisibleSelected.value })
watch(pageCount, (count) => { if (currentPage.value > count) currentPage.value = count })

onMounted(async () => {
  try {
    const catalog = await getResourceCatalog()
    const amrs: DeviceRow[] = catalog.amrs.map((item, index) => ({ sn: `SN-AMR-${String(index + 1).padStart(4, '0')}`, name: item.name, vendor: index % 3 === 2 ? '海康机器人' : '仙工智能', ip: item.ip, type: '复合机器人', site: 'GL-C06-4F', updatedAt: `2026-09-07 ${String(9 + Math.floor(index / 3)).padStart(2, '0')}:${String(12 + index * 4).padStart(2, '0')}`, source: index === 7 ? '手动录入' : '设备台账' }))
    const devices: DeviceRow[] = catalog.devices.map((item, index) => ({ sn: item.type === 'machine' ? `SN-ARM-${item.id}-${String(index + 1).padStart(3, '0')}` : `SN-AUX-${item.id}`, name: item.name || item.label, vendor: item.type === 'machine' ? '新松机器人' : '厂务自动化', ip: `10.197.138.${41 + index}`, type: '上下料', site: 'GL-C06-4F', updatedAt: `2026-09-06 ${String(13 + (index % 5)).padStart(2, '0')}:${String(8 + (index * 3) % 50).padStart(2, '0')}`, source: index % 6 === 0 ? '手动录入' : '设备台账' }))
    deviceRows.value = [...amrs, ...devices]
  } finally { loading.value = false }
})
</script>

<template>
  <section class="resource-page device-ledger-page">
    <header class="resource-page__header device-ledger-header">
      <div><p class="page-eyebrow">DEVICE LEDGER</p><h1>设备管理</h1></div>
      <div class="device-header-actions"><button class="device-secondary-action" type="button" @click="openImport">⇩ {{ selectedSns.length ? `更新已选设备（${selectedSns.length}）` : '导入设备' }}</button></div>
    </header>
    <div class="resource-toolbar device-ledger-toolbar">
      <label><span>⌕</span><input v-model="querySn" placeholder="设备 SN"></label>
      <label><span>⌕</span><input v-model="queryName" placeholder="设备名称"></label>
      <label><span>⌕</span><input v-model="queryVendor" placeholder="厂商"></label>
      <label><span>⌕</span><input v-model="queryIp" placeholder="IP 地址"></label>
      <label><span>⌕</span><input v-model="queryType" placeholder="设备类型" @keyup.enter="searchDevices"></label>
      <button class="device-query-button" type="button" @click="searchDevices">查询</button>
    </div>
    <div v-if="loading" class="resource-loading">正在读取设备数据</div>
    <div v-else class="resource-table-wrap device-ledger-table-wrap">
      <table class="resource-table device-ledger-table">
        <colgroup><col class="col-check"><col class="col-sn"><col class="col-name"><col class="col-type"><col class="col-vendor"><col class="col-ip"><col class="col-location"><col class="col-updated"><col class="col-action"></colgroup>
        <thead><tr><th class="device-check-cell"><input ref="selectAllRef" type="checkbox" :checked="allVisibleSelected" aria-label="选择当前页全部设备" @change="toggleAllVisible"></th><th>设备 SN</th><th>设备名称</th><th>设备类型</th><th>厂商</th><th>IP 地址</th><th>厂区 / 楼栋 / 楼层</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in paginatedRows" :key="item.sn" :class="{ selected: selectedSns.includes(item.sn) }"><td class="device-check-cell"><input v-model="selectedSns" type="checkbox" :value="item.sn"></td><td class="resource-id type-data">{{ item.sn }}</td><td><strong>{{ item.name }}</strong></td><td><span class="device-type-tag" :class="item.type === '复合机器人' ? 'amr' : 'arm'">{{ item.type }}</span></td><td>{{ item.vendor }}</td><td class="type-data">{{ item.ip }}</td><td>{{ item.site }}</td><td class="type-data device-updated-at">{{ item.updatedAt }}</td><td><button class="table-action" type="button" @click="openEdit(item)">编辑</button></td></tr>
          <tr v-if="filteredRows.length === 0"><td class="device-empty" colspan="9">没有符合当前条件的设备</td></tr>
        </tbody>
      </table>
    </div>
    <footer v-if="!loading" class="task-pagination device-ledger-pagination"><span>共 {{ filteredRows.length }} 条 · 每页 {{ pageSize }} 条<span v-if="selectedSns.length"> · 已选择 {{ selectedSns.length }} 条</span></span><nav aria-label="设备列表分页"><button :disabled="currentPage === 1" aria-label="上一页" @click="currentPage--">‹</button><template v-for="item in paginationItems" :key="item"><button v-if="typeof item === 'number'" :class="{ active: currentPage === item }" :aria-label="`第 ${item} 页`" @click="currentPage = item">{{ item }}</button><span v-else class="device-pagination-ellipsis">…</span></template><button :disabled="currentPage === pageCount" aria-label="下一页" @click="currentPage++">›</button></nav></footer>

    <div v-if="editorOpen" class="modal-backdrop" @click.self="editorOpen = false">
      <section class="create-dialog device-editor-dialog">
        <header><div><span>{{ editorMode === 'create' ? 'CREATE DEVICE' : 'EDIT DEVICE' }}</span><strong>{{ editorMode === 'create' ? '新增设备' : '编辑设备' }}</strong></div><button aria-label="关闭" @click="editorOpen = false">×</button></header>
        <form class="device-editor-form" @submit.prevent="saveDevice">
          <p v-if="editorError" class="device-form-error">{{ editorError }}</p>
          <label><span>设备 SN</span><input v-model.trim="form.sn" :disabled="editorMode === 'edit'" placeholder="例如 SN-AMR-0010"></label>
          <label><span>设备名称</span><input v-model.trim="form.name" placeholder="请输入设备名称"></label>
          <label><span>设备类型</span><select v-model="form.type"><option>复合机器人</option><option>上下料</option></select></label>
          <label><span>厂商</span><input v-model.trim="form.vendor" placeholder="请输入厂商"></label>
          <label><span>IP 地址</span><input v-model.trim="form.ip" placeholder="例如 10.197.138.100"></label>
          <label><span>厂区 / 楼栋 / 楼层</span><input v-model.trim="form.site" placeholder="例如 GL-C06-4F"></label>
        </form>
        <footer><button type="button" @click="editorOpen = false">取消</button><button class="primary" type="button" @click="saveDevice">保存</button></footer>
      </section>
    </div>

    <div v-if="importOpen" class="modal-backdrop" @click.self="importOpen = false">
      <section class="create-dialog device-import-dialog">
        <header><div><span>IMPORT DEVICE</span><strong>{{ selectedSns.length ? '更新已选设备' : '导入设备' }}</strong><small>{{ selectedSns.length ? `按照主列表勾选的 ${selectedSns.length} 个 SN 获取最新资料` : '从设备台账及维保系统检查新增与更新资料' }}</small></div><button aria-label="关闭" @click="importOpen = false">×</button></header>
        <div class="device-import-meta"><div class="device-sync-status"><span>上次拉取</span><strong>{{ lastPulledAt }}</strong><i v-if="pulledCandidates.length">已发现 {{ pulledCandidates.length }} 条变更</i></div><button class="device-refresh-button" type="button" @click="pullLatestDevices"><b>↻</b>获取最新资料</button></div>
        <p v-if="importMessage" class="device-import-success">{{ importMessage }}</p>
        <div class="device-import-list"><div v-if="pulledCandidates.length === 0" class="device-import-empty"><i>↻</i><strong>等待获取设备资料</strong><span>从设备台账和维保系统检查新增或更新。</span></div><label v-for="item in pulledCandidates" :key="item.sn" :class="{ selected: selectedImportSns.includes(item.sn) }"><input v-model="selectedImportSns" type="checkbox" :value="item.sn"><span><strong>{{ item.name }}</strong><small>{{ item.sn }} · {{ item.ip }} · {{ item.source }}</small></span><em :class="item.action">{{ item.action }}</em></label></div>
        <footer><button type="button" @click="importOpen = false">取消</button><button class="primary" type="button" :disabled="selectedImportSns.length === 0" @click="writeImportedDevices">写入设备（{{ selectedImportSns.length }}）</button></footer>
      </section>
    </div>
  </section>
</template>
