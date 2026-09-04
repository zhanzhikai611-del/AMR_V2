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
const selectedDeviceType = ref('全部')
const importOpen = ref(false)
const editingId = ref<string | null>(null)
const selectedRelations = ref<string[]>([])
const meta = computed(() => props.section === 'amrs'
  ? { eyebrow: 'AMR ASSETS', title: 'AMR 管理', description: '基础资料来自设备台账，在此维护服务设备关系。', action: '导入 AMR' }
  : { eyebrow: 'DEVICE ASSETS', title: '设备管理', description: '基础资料来自设备台账，在此维护服务 AMR 关系。', action: '导入设备' })
const includesQuery = (values: unknown[]) => values.join(' ').toLowerCase().includes(query.value.trim().toLowerCase())
const amrs = computed(() => (catalog.value?.amrs ?? []).filter((item) => includesQuery([item.id, item.name, item.ip, item.model])))
const deviceTypeLabels: Record<string, string> = { machine: '生产设备', buffer: '中转台', charge: '充电站', door: '自动门', recycle: '回收站' }
const deviceTypeOptions = computed(() => [...new Set((catalog.value?.devices ?? []).map((item) => item.type))])
const deviceTypeLabel = (type: string) => deviceTypeLabels[type] ?? type
const devices = computed(() => (catalog.value?.devices ?? []).filter((item) => {
  const matchesType = selectedDeviceType.value === '全部' || item.type === selectedDeviceType.value
  return matchesType && includesQuery([item.id, item.label, item.name, item.group, deviceTypeLabel(item.type)])
}))
const serviceAmrs = (deviceId: string) => catalog.value?.amrs.filter((item) => item.serviceDevices.includes(deviceId)).map((item) => item.id) ?? []
const servicePreview = (ids: string[]) => ids.slice(0, 4)
const editingAmr = computed(() => props.section === 'amrs' ? catalog.value?.amrs.find((item) => item.id === editingId.value) : undefined)
const editingDevice = computed(() => props.section === 'devices' ? catalog.value?.devices.find((item) => item.id === editingId.value) : undefined)

function openEdit(id: string) {
  editingId.value = id
  selectedRelations.value = props.section === 'amrs'
    ? [...(catalog.value?.amrs.find((item) => item.id === id)?.serviceDevices ?? [])]
    : serviceAmrs(id)
}

function toggleRelation(id: string) {
  selectedRelations.value = selectedRelations.value.includes(id)
    ? selectedRelations.value.filter((item) => item !== id)
    : [...selectedRelations.value, id]
}

function saveRelations() {
  if (!catalog.value || !editingId.value) return
  if (props.section === 'amrs') {
    const amr = catalog.value.amrs.find((item) => item.id === editingId.value)
    if (amr) amr.serviceDevices = [...selectedRelations.value]
  } else {
    catalog.value.amrs.forEach((amr) => {
      const shouldServe = selectedRelations.value.includes(amr.id)
      const servesNow = amr.serviceDevices.includes(editingId.value!)
      if (shouldServe && !servesNow) amr.serviceDevices.push(editingId.value!)
      if (!shouldServe && servesNow) amr.serviceDevices = amr.serviceDevices.filter((id) => id !== editingId.value)
    })
  }
  editingId.value = null
}

onMounted(async () => {
  try { catalog.value = await getResourceCatalog() } finally { loading.value = false }
})
</script>

<template>
  <section class="resource-page">
    <header class="resource-page__header">
      <div><p class="page-eyebrow">{{ meta.eyebrow }}</p><h1>{{ meta.title }}</h1><p>{{ meta.description }}</p></div>
      <button class="resource-primary-action" type="button" @click="importOpen = true">⇩ {{ meta.action }}</button>
    </header>
    <div class="resource-toolbar">
      <label><span>⌕</span><input v-model="query" :placeholder="`搜索${meta.title.replace('管理', '')}编号或名称`"></label>
      <div v-if="section === 'devices'" class="resource-filter-group">
        <span>设备类型</span>
        <select v-model="selectedDeviceType" aria-label="设备类型"><option>全部</option><option v-for="type in deviceTypeOptions" :key="type" :value="type">{{ deviceTypeLabel(type) }}</option></select>
      </div>
    </div>
    <div v-if="loading" class="resource-loading">正在读取资源数据</div>
    <div v-else class="resource-table-wrap">
      <table v-if="section === 'amrs'" class="resource-table">
        <thead><tr><th>AMR 编号</th><th>名称</th><th>IP 地址</th><th>型号</th><th>服务设备</th><th>运行状态</th><th>电量</th><th>操作</th></tr></thead>
        <tbody><tr v-for="item in amrs" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.name }}</strong><small>{{ item.initialPoint }}</small></td><td class="type-data">{{ item.ip }}</td><td>{{ item.model }}</td><td><div class="resource-chip-list"><i v-for="id in servicePreview(item.serviceDevices)" :key="id">{{ id }}</i><i v-if="item.serviceDevices.length > 4" class="resource-chip-more">+{{ item.serviceDevices.length - 4 }}</i></div></td><td><span class="asset-status" :class="item.tone">{{ item.status }}</span></td><td class="type-data">{{ item.battery }}%</td><td><div class="row-actions"><button class="table-action" @click="router.push(`/resources/amrs/${item.id}`)">查看</button><button class="table-action" @click="openEdit(item.id)">编辑</button></div></td></tr></tbody>
      </table>
      <table v-else class="resource-table">
        <thead><tr><th>设备编号</th><th>设备名称</th><th>类型</th><th>连接状态</th><th>绑定点位</th><th>设备组</th><th>服务 AMR</th><th>操作</th></tr></thead>
        <tbody><tr v-for="item in devices" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.name || item.label }}</strong></td><td>{{ deviceTypeLabel(item.type) }}</td><td><span class="asset-status" :class="item.connected === false ? 'offline' : 'success'">{{ item.connected === false ? '离线' : '在线' }}</span></td><td class="resource-link">{{ item.boundPoint || '—' }}</td><td>{{ item.group || '—' }}</td><td><div class="resource-chip-list"><i v-for="id in serviceAmrs(item.id)" :key="id">{{ id }}</i></div></td><td><div class="row-actions"><button class="table-action" @click="router.push(`/resources/devices/${item.id}`)">查看</button><button class="table-action" @click="openEdit(item.id)">编辑</button></div></td></tr></tbody>
      </table>
    </div>

    <div v-if="importOpen" class="modal-backdrop" @click.self="importOpen = false">
      <section class="create-dialog ledger-import-dialog">
        <header><div><span>DEVICE LEDGER</span><strong>从设备台账导入{{ section === 'amrs' ? ' AMR' : '设备' }}</strong></div><button aria-label="关闭" @click="importOpen = false">×</button></header>
        <div class="ledger-import-note"><b>数据来源</b><strong>现有设备台账</strong><p>编号、名称、型号、网络信息及设备属性将以台账资料为准。导入后，可在列表中编辑服务关系。</p></div>
        <footer><button @click="importOpen = false">取消</button><button class="primary" @click="importOpen = false">开始导入</button></footer>
      </section>
    </div>

    <div v-if="editingId" class="modal-backdrop" @click.self="editingId = null">
      <section class="binding-dialog resource-relation-dialog">
        <header><div><span>EDIT SERVICE RELATION</span><strong>编辑{{ section === 'amrs' ? '服务设备' : '服务 AMR' }}</strong><small>{{ editingId }} · 基础资料由设备台账同步，不可在此修改</small></div><button aria-label="关闭" @click="editingId = null">×</button></header>
        <div class="resource-ledger-summary"><span>台账名称</span><strong>{{ editingAmr?.name || editingDevice?.name || editingDevice?.label }}</strong><span>{{ section === 'amrs' ? editingAmr?.model : editingDevice?.type }}</span></div>
        <div class="amr-binding-list">
          <label v-for="option in section === 'amrs' ? devices : amrs" :key="option.id" :class="{ selected: selectedRelations.includes(option.id) }">
            <input type="checkbox" :checked="selectedRelations.includes(option.id)" @change="toggleRelation(option.id)">
            <span><strong>{{ option.id }}</strong><small>{{ 'ip' in option ? option.name : option.name || option.label }}</small></span>
            <em>{{ selectedRelations.includes(option.id) ? '已服务' : '未服务' }}</em>
          </label>
        </div>
        <footer><button @click="editingId = null">取消</button><button class="primary" @click="saveRelations">保存关系</button></footer>
      </section>
    </div>
  </section>
</template>
