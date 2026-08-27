<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getResourceCatalog } from '../api/modules/resources'
import type { ResourceCatalog } from '../types/domain'

type Section = 'amrs' | 'amr-models' | 'devices' | 'device-types' | 'maps'
const props = defineProps<{ section: Section }>()
const router = useRouter()
const catalog = ref<ResourceCatalog | null>(null)
const loading = ref(true)
const query = ref('')

const meta = computed(() => ({
  amrs: { eyebrow: 'AMR ASSETS', title: 'AMR 列表', description: '查看车辆运行状态、型号及服务设备关系。', action: '新增 AMR' },
  'amr-models': { eyebrow: 'AMR MODELS', title: 'AMR 型号', description: '维护车辆能力与运动参数。', action: '新增型号' },
  devices: { eyebrow: 'DEVICE ASSETS', title: '设备列表', description: '管理发起任务请求的 CNC 与 HOME 站点。', action: '新增设备' },
  'device-types': { eyebrow: 'DEVICE TYPES', title: '设备类型', description: '维护设备类型、点位要求和状态集合。', action: '新增类型' },
  maps: { eyebrow: 'MAP ASSETS', title: '地图管理', description: '管理地图实体、运行版本与编辑版本。', action: '创建地图' },
}[props.section]))

const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const includesQuery = (values: unknown[]) => !normalizedQuery.value || values.join(' ').toLowerCase().includes(normalizedQuery.value)
const amrs = computed(() => (catalog.value?.amrs ?? []).filter((item) => includesQuery([item.id, item.name, item.ip, item.model])))
const devices = computed(() => (catalog.value?.devices ?? []).filter((item) => includesQuery([item.id, item.name, item.group])))
const models = computed(() => (catalog.value?.models ?? []).filter((item) => includesQuery([item.id, item.chassis])))
const types = computed(() => (catalog.value?.deviceTypes ?? []).filter((item) => includesQuery([item.id, item.name])))
const maps = computed(() => (catalog.value?.maps ?? []).filter((item) => includesQuery([item.id, item.name, item.floor])))
const modelCount = (modelId: string) => catalog.value?.amrs.filter((item) => item.model === modelId).length ?? 0
const deviceServiceAmrs = (deviceId: string) => catalog.value?.amrs.filter((item) => item.serviceDevices.includes(deviceId)).map((item) => item.id) ?? []

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
      <label><span>⌕</span><input v-model="query" :placeholder="`搜索${meta.title.replace('列表', '')}`"></label>
      <div><button type="button">全部状态⌄</button><button v-if="section !== 'maps'" type="button">全部类型⌄</button></div>
    </div>
    <div v-if="loading" class="resource-loading">正在读取资源数据</div>
    <div v-else class="resource-table-wrap">
      <table v-if="section === 'amrs'" class="resource-table"><thead><tr><th>AMR 编号</th><th>名称</th><th>IP 地址</th><th>型号</th><th>服务范围</th><th>运行状态</th><th>电量</th><th>操作</th></tr></thead><tbody><tr v-for="item in amrs" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.name }}</strong><small>{{ item.initialPoint }}</small></td><td class="type-data">{{ item.ip }}</td><td>{{ item.model }}</td><td><div class="resource-chip-list"><i v-for="id in item.serviceDevices" :key="id">{{ id }}</i></div></td><td><span class="asset-status" :class="item.tone">{{ item.status }}</span></td><td class="type-data">{{ item.battery }}%</td><td><button class="table-action" type="button" @click="router.push(`/resources/amrs/${item.id}`)">查看</button></td></tr></tbody></table>
      <table v-else-if="section === 'devices'" class="resource-table"><thead><tr><th>设备编号</th><th>设备名称</th><th>类型</th><th>连接</th><th>绑定点位</th><th>设备组</th><th>服务 AMR</th><th>操作</th></tr></thead><tbody><tr v-for="item in devices" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.name }}</strong></td><td>{{ item.type === 'machine' ? 'CNC' : 'HOME' }}</td><td><span class="asset-status success">{{ item.connected ? '在线' : '离线' }}</span></td><td class="resource-link">{{ item.boundPoint }}</td><td>{{ item.group }}</td><td><div class="resource-chip-list"><i v-for="id in deviceServiceAmrs(item.id)" :key="id">{{ id }}</i></div></td><td><button class="table-action" type="button" @click="router.push(`/resources/devices/${item.id}`)">查看</button></td></tr></tbody></table>
      <table v-else-if="section === 'amr-models'" class="resource-table"><thead><tr><th>型号</th><th>底盘类型</th><th>最大线速度</th><th>最大角速度</th><th>加速度</th><th>到达阈值</th><th>前视距离</th><th>车辆数量</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="item in models" :key="item.id"><td class="resource-id">{{ item.id }}</td><td>{{ item.chassis }}</td><td class="type-data">{{ item.maxSpeed }}</td><td class="type-data">{{ item.maxAngularSpeed }}</td><td class="type-data">{{ item.acceleration }}</td><td class="type-data">{{ item.arrivalThreshold }}</td><td class="type-data">{{ item.lookaheadDistance }}</td><td>{{ modelCount(item.id) }} 台</td><td><span class="asset-status success">启用</span></td><td><button class="table-action" type="button">编辑</button></td></tr></tbody></table>
      <table v-else-if="section === 'device-types'" class="resource-table"><thead><tr><th>类型编码</th><th>显示名称</th><th>设备数量</th><th>点位要求</th><th>状态集合</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="item in types" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.name }}</strong></td><td>{{ devices.filter((device) => device.type === 'machine').length }} 台</td><td>{{ item.pointRequirement }}</td><td>{{ item.statusCount }} 个状态</td><td><span class="asset-status success">启用</span></td><td><button class="table-action" type="button">编辑</button></td></tr></tbody></table>
      <table v-else class="resource-table"><thead><tr><th>地图编号</th><th>地图名称</th><th>楼层</th><th>创建来源</th><th>状态</th><th>运行版本</th><th>编辑版本</th><th>更新时间</th><th>操作</th></tr></thead><tbody><tr v-for="item in maps" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.name }}</strong><small v-if="item.current">当前运行地图</small></td><td>{{ item.floor }}</td><td>{{ item.source }}</td><td><span class="asset-status" :class="item.status === '已发布' ? 'success' : 'draft'">{{ item.status }}</span></td><td class="type-data">{{ item.runtimeVersion }}</td><td class="type-data">{{ item.editVersion }}</td><td class="type-data">{{ item.updatedAt }}</td><td><button class="table-action" type="button">{{ item.current ? '编辑' : '设为当前' }}</button></td></tr></tbody></table>
    </div>
  </section>
</template>
