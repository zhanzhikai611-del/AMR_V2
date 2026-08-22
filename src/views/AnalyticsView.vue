<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getAmrAnalytics, getGlobalAnalytics } from '../api/modules/analytics'
import AnalyticsTrendChart from '../features/analytics/AnalyticsTrendChart.vue'
import StateDurationPanel from '../features/analytics/StateDurationPanel.vue'
import { useRuntimeScopeStore } from '../stores/runtimeScope'
import type { AmrAnalytics, AnalyticsRange, GlobalAnalytics } from '../types/analytics'

const runtimeScope = useRuntimeScopeStore()
const activeTab = ref<'global' | 'vehicle'>('global')
const range = ref<AnalyticsRange>('7d')
const selectedAmrId = ref('AMR-06')
const globalData = ref<GlobalAnalytics | null>(null)
const vehicleData = ref<AmrAnalytics | null>(null)
const loading = ref(true)
const error = ref('')
const taskKeyword = ref('')
const taskResult = ref<'all' | '已完成' | '已取消'>('all')
const taskPage = ref(1)
const alarmKeyword = ref('')
const alarmType = ref('all')
const alarmPage = ref(1)
const taskPageSize = 10
const alarmPageSize = 8

const rangeLabel = computed(() => range.value === 'today' ? '今日' : range.value === '7d' ? '近 7 天' : '近 30 天')
const filteredTasks = computed(() => {
  const keyword = taskKeyword.value.trim().toLowerCase()
  return (vehicleData.value?.tasks ?? []).filter((task) => {
    const matchesKeyword = !keyword || [task.id, task.type, task.requestDeviceId].some((value) => value.toLowerCase().includes(keyword))
    return matchesKeyword && (taskResult.value === 'all' || task.result === taskResult.value)
  })
})
const taskPageCount = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / taskPageSize)))
const paginatedTasks = computed(() => filteredTasks.value.slice((taskPage.value - 1) * taskPageSize, taskPage.value * taskPageSize))
const alarmTypes = computed(() => Array.from(new Set((vehicleData.value?.alarms ?? []).map((alarm) => alarm.type))))
const filteredAlarms = computed(() => {
  const keyword = alarmKeyword.value.trim().toLowerCase()
  return (vehicleData.value?.alarms ?? []).filter((alarm) => {
    const matchesKeyword = !keyword || [alarm.id, alarm.type, alarm.taskId ?? ''].some((value) => value.toLowerCase().includes(keyword))
    return matchesKeyword && (alarmType.value === 'all' || alarm.type === alarmType.value)
  })
})
const alarmPageCount = computed(() => Math.max(1, Math.ceil(filteredAlarms.value.length / alarmPageSize)))
const paginatedAlarms = computed(() => filteredAlarms.value.slice((alarmPage.value - 1) * alarmPageSize, alarmPage.value * alarmPageSize))

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`
}

async function loadGlobal() {
  globalData.value = await getGlobalAnalytics({ scopeId: runtimeScope.current.id, range: range.value })
}

async function loadVehicle() {
  vehicleData.value = await getAmrAnalytics(selectedAmrId.value, { scopeId: runtimeScope.current.id, range: range.value })
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadGlobal(), loadVehicle()])
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '数据分析加载失败'
  } finally {
    loading.value = false
  }
}

async function openVehicle(amrId: string) {
  selectedAmrId.value = amrId
  activeTab.value = 'vehicle'
  await loadVehicle()
}

watch(range, loadAll)
watch(selectedAmrId, () => { if (activeTab.value === 'vehicle') void loadVehicle() })
watch([taskKeyword, taskResult], () => { taskPage.value = 1 })
watch([alarmKeyword, alarmType], () => { alarmPage.value = 1 })
watch(vehicleData, () => { taskPage.value = 1; alarmPage.value = 1 })
onMounted(loadAll)
</script>

<template>
  <section class="resource-page analytics-page">
    <header class="resource-page__header analytics-page__header">
      <div><p class="page-eyebrow">OPERATION ANALYTICS</p><h1>数据分析</h1></div>
    </header>

    <nav class="analytics-view-tabs" aria-label="数据分析层级">
      <div class="analytics-view-tabs__items">
        <button type="button" :class="{ active: activeTab === 'global' }" @click="activeTab = 'global'">全局分析</button>
        <button type="button" :class="{ active: activeTab === 'vehicle' }" @click="activeTab = 'vehicle'">单车分析</button>
      </div>
      <div class="analytics-context-tools">
        <span class="analytics-scope-context">当前范围 <strong>{{ runtimeScope.current.label }}</strong></span>
        <label><span>统计周期</span><select v-model="range"><option value="today">今日</option><option value="7d">近 7 天</option><option value="30d">近 30 天</option></select></label>
      </div>
    </nav>

    <div v-if="loading" class="analytics-loading"><span class="loading-mark"></span><strong>正在汇总运行数据</strong></div>
    <div v-else-if="error" class="analytics-loading error"><strong>{{ error }}</strong><button type="button" @click="loadAll">重新加载</button></div>

    <template v-else-if="activeTab === 'global' && globalData">
      <section class="analytics-metrics" aria-label="全局分析指标">
        <article class="primary"><span>全局 AMR 稼动率</span><strong>{{ globalData.summary.utilizationRate }}<small>%</small></strong><em>{{ rangeLabel }}</em></article>
        <article><span>任务量</span><strong>{{ globalData.summary.taskCount }}</strong><em>完成 {{ globalData.summary.completedCount }}</em></article>
        <article><span>任务完成率</span><strong>{{ globalData.summary.completionRate }}<small>%</small></strong><em>{{ rangeLabel }}</em></article>
        <article class="warning"><span>报警 / 异常</span><strong>{{ globalData.summary.alarmCount }}</strong><em>累计 {{ formatMinutes(globalData.summary.abnormalDurationMinutes) }}</em></article>
        <article><span>统计车辆</span><strong>{{ globalData.vehicles.length }}</strong><em>当前运行范围</em></article>
      </section>

      <div class="analytics-grid analytics-grid--trend">
        <section class="analytics-panel trend-panel">
          <header><strong>稼动率与任务趋势</strong><div><span><i class="line"></i>稼动率</span><span><i class="bar"></i>任务量</span></div></header>
          <AnalyticsTrendChart :points="globalData.trend" />
        </section>
        <section class="analytics-panel state-panel">
          <header><strong>状态时长占比</strong><span>{{ rangeLabel }}</span></header>
          <StateDurationPanel :items="globalData.stateDurations" />
        </section>
      </div>

      <div class="analytics-grid analytics-grid--ranking">
        <section class="analytics-panel vehicle-ranking-panel">
          <header><strong>车辆利用情况</strong><span>按稼动率排序</span></header>
          <div class="vehicle-utilization-list">
            <button v-for="vehicle in globalData.vehicles" :key="vehicle.amrId" type="button" @click="openVehicle(vehicle.amrId)">
              <span class="vehicle-rank-id type-data">{{ vehicle.amrId }}</span>
              <span class="vehicle-rank-bar"><i :style="{ width: `${vehicle.utilizationRate}%` }"></i></span>
              <strong class="type-data">{{ vehicle.utilizationRate }}%</strong>
              <small>{{ vehicle.taskCount }} 项任务</small>
              <b>›</b>
            </button>
          </div>
        </section>
        <section class="analytics-panel alarm-summary-panel">
          <header><strong>报警与异常统计</strong><span>{{ rangeLabel }}</span></header>
          <ol>
            <li v-for="(alarm, index) in globalData.alarmTypes" :key="alarm.type"><b>{{ String(index + 1).padStart(2, '0') }}</b><span>{{ alarm.type }}</span><strong>{{ alarm.count }}</strong><small>{{ formatMinutes(alarm.affectedMinutes) }}</small></li>
          </ol>
        </section>
      </div>
    </template>

    <template v-else-if="vehicleData">
      <section class="vehicle-analysis-toolbar">
        <div><span>分析车辆</span><select v-model="selectedAmrId"><option v-for="vehicle in globalData?.vehicles ?? []" :key="vehicle.amrId" :value="vehicle.amrId">{{ vehicle.amrId }} · {{ vehicle.name }}</option></select></div>
        <div class="vehicle-analysis-identity"><strong>{{ vehicleData.name }}</strong><span>{{ vehicleData.model }}</span></div>
      </section>

      <section class="analytics-metrics vehicle-metrics" aria-label="单车分析指标">
        <article class="primary"><span>单车稼动率</span><strong>{{ vehicleData.summary.utilizationRate }}<small>%</small></strong><em>{{ rangeLabel }}</em></article>
        <article><span>任务量</span><strong>{{ vehicleData.summary.taskCount }}</strong><em>完成 {{ vehicleData.summary.completedCount }}</em></article>
        <article><span>任务完成率</span><strong>{{ vehicleData.summary.completionRate }}<small>%</small></strong><em>{{ rangeLabel }}</em></article>
        <article class="warning"><span>报警 / 异常</span><strong>{{ vehicleData.summary.alarmCount }}</strong><em>累计 {{ formatMinutes(vehicleData.summary.abnormalDurationMinutes) }}</em></article>
      </section>

      <section class="analytics-panel analytics-record-panel">
        <header><strong>任务执行记录</strong><span>{{ filteredTasks.length }} 条</span></header>
        <div class="analytics-record-toolbar">
          <label><span>⌕</span><input v-model="taskKeyword" type="search" placeholder="搜索任务编号、类型或请求设备"></label>
          <select v-model="taskResult"><option value="all">全部结果</option><option value="已完成">已完成</option><option value="已取消">已取消</option></select>
        </div>
        <div class="resource-table-wrap">
          <table class="resource-table"><thead><tr><th>任务</th><th>请求设备</th><th>开始时间</th><th>结束时间</th><th>耗时</th><th>结果</th></tr></thead><tbody><tr v-for="task in paginatedTasks" :key="task.id"><td><strong>{{ task.id }}</strong><small>{{ task.type }}</small></td><td class="type-data">{{ task.requestDeviceId }}</td><td class="type-data">{{ task.startedAt }}</td><td class="type-data">{{ task.endedAt }}</td><td class="type-data">{{ task.duration }}</td><td><span class="asset-status" :class="task.result === '已完成' ? 'success' : 'neutral'">{{ task.result }}</span></td></tr><tr v-if="!paginatedTasks.length"><td colspan="6" class="analytics-empty-row">没有符合条件的任务记录</td></tr></tbody></table>
        </div>
        <footer class="task-pagination"><span>共 {{ filteredTasks.length }} 条 · 每页 {{ taskPageSize }} 条</span><nav aria-label="任务执行记录分页"><button type="button" :disabled="taskPage === 1" @click="taskPage--">上一页</button><button v-for="page in taskPageCount" :key="page" type="button" :class="{ active: taskPage === page }" @click="taskPage = page">{{ page }}</button><button type="button" :disabled="taskPage === taskPageCount" @click="taskPage++">下一页</button></nav></footer>
      </section>

      <section class="analytics-panel analytics-record-panel alarm-record-panel">
        <header><strong>报警及异常历史</strong><span>{{ filteredAlarms.length }} 条</span></header>
        <div class="analytics-record-toolbar">
          <label><span>⌕</span><input v-model="alarmKeyword" type="search" placeholder="搜索异常编号、类型或关联任务"></label>
          <select v-model="alarmType"><option value="all">全部类型</option><option v-for="type in alarmTypes" :key="type" :value="type">{{ type }}</option></select>
        </div>
        <div class="resource-table-wrap">
          <table class="resource-table"><thead><tr><th>异常类型</th><th>发生时间</th><th>恢复时间</th><th>持续时长</th><th>关联任务</th><th>结果</th></tr></thead><tbody><tr v-for="alarm in paginatedAlarms" :key="alarm.id"><td><strong>{{ alarm.type }}</strong><small class="type-data">{{ alarm.id }}</small></td><td class="type-data">{{ alarm.occurredAt }}</td><td class="type-data">{{ alarm.recoveredAt }}</td><td class="type-data">{{ alarm.duration }}</td><td class="type-data">{{ alarm.taskId ?? '—' }}</td><td><span class="asset-status success">{{ alarm.result }}</span></td></tr><tr v-if="!paginatedAlarms.length"><td colspan="6" class="analytics-empty-row">没有符合条件的异常记录</td></tr></tbody></table>
        </div>
        <footer class="task-pagination"><span>共 {{ filteredAlarms.length }} 条 · 每页 {{ alarmPageSize }} 条</span><nav aria-label="报警及异常历史分页"><button type="button" :disabled="alarmPage === 1" @click="alarmPage--">上一页</button><button v-for="page in alarmPageCount" :key="page" type="button" :class="{ active: alarmPage === page }" @click="alarmPage = page">{{ page }}</button><button type="button" :disabled="alarmPage === alarmPageCount" @click="alarmPage++">下一页</button></nav></footer>
      </section>

      <div class="analytics-grid analytics-grid--trend">
        <section class="analytics-panel trend-panel"><header><strong>单车历史趋势</strong><div><span><i class="line"></i>稼动率</span><span><i class="bar"></i>任务量</span></div></header><AnalyticsTrendChart :points="vehicleData.trend" /></section>
        <section class="analytics-panel state-panel"><header><strong>运行时长构成</strong><span>{{ rangeLabel }}</span></header><StateDurationPanel :items="vehicleData.stateDurations" /></section>
      </div>
    </template>
  </section>
</template>
