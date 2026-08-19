<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getDispatchSettings, updateDispatchSettings } from '../api/modules/dispatch'
import { getTwinSnapshot } from '../api/modules/operations'
import { getTaskRecords } from '../api/modules/task-records'
import type { DispatchSettings, Task, TaskRecord } from '../types/domain'

type TaskListItem = {
  id: string
  type: string
  requestDeviceId: string
  amrId: string
  status: Task['status'] | TaskRecord['result']
  requestedAt: string
  finishedAt: string
  duration: string
  behaviorName: string
  active: boolean
}

const records = ref<TaskRecord[]>([])
const activeTasks = ref<Task[]>([])
const query = ref('')
const statusFilter = ref('全部状态')
const dateFilter = ref('近 7 天')
const dispatch = ref<DispatchSettings>({ strategy: '规则优先', apsEnabled: false, updatedAt: '' })
const dispatchSaved = ref(false)
const dispatchOpen = ref(false)
const currentPage = ref(1)
const pageSize = 10

const allTasks = computed<TaskListItem[]>(() => [
  ...activeTasks.value.map((item) => ({
    id: item.id,
    type: item.type,
    requestDeviceId: item.requestDeviceId,
    amrId: item.amrId ?? '待分配',
    status: item.status === '等待中' ? '运行中' : item.status,
    requestedAt: `2026-08-15 ${item.events[0]?.time ?? '—'}`,
    finishedAt: '—',
    duration: item.duration,
    behaviorName: item.behaviorName,
    active: true,
  })),
  ...records.value.map((item) => ({
    id: item.id,
    type: item.type,
    requestDeviceId: item.requestDeviceId,
    amrId: item.amrId,
    status: item.result,
    requestedAt: item.requestedAt,
    finishedAt: item.finishedAt,
    duration: item.duration,
    behaviorName: item.behaviorName,
    active: false,
  })),
])

const dateScopedTasks = computed(() => allTasks.value.filter((item) => {
  const recordDate = new Date(item.requestedAt.replace(' ', 'T')).getTime()
  const cutoff = dateFilter.value === '今日' ? new Date('2026-08-15T00:00:00').getTime() : dateFilter.value === '近 7 天' ? new Date('2026-08-09T00:00:00').getTime() : dateFilter.value === '近 30 天' ? new Date('2026-07-17T00:00:00').getTime() : 0
  return recordDate >= cutoff
}))

const filtered = computed(() => dateScopedTasks.value.filter((item) => {
  const matchesQuery = `${item.id}${item.type}${item.requestDeviceId}${item.amrId}`.toLowerCase().includes(query.value.toLowerCase())
  const matchesStatus = statusFilter.value === '全部状态'
    || (statusFilter.value === '进行中' && item.active)
    || item.status === statusFilter.value
  return matchesQuery && matchesStatus
}))

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paginatedTasks = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))

watch([query, statusFilter, dateFilter], () => { currentPage.value = 1 })
watch(pageCount, (count) => { if (currentPage.value > count) currentPage.value = count })

function statusClass(item: TaskListItem) {
  if (item.status === '已完成') return 'success'
  if (item.status === '已取消') return 'neutral'
  if (item.status === '等待中' || item.status === '待调度') return 'waiting'
  if (item.status === '异常') return 'fault'
  return 'running'
}

async function saveDispatch() {
  dispatch.value = await updateDispatchSettings({ ...dispatch.value, updatedAt: '2026-08-19 08:35:00' })
  dispatchSaved.value = true
  window.setTimeout(() => { dispatchSaved.value = false }, 1800)
  dispatchOpen.value = false
}

onMounted(async () => {
  const [history, snapshot, settings] = await Promise.all([getTaskRecords(), getTwinSnapshot(), getDispatchSettings()])
  records.value = history
  activeTasks.value = snapshot.tasks
  dispatch.value = settings
})
</script>

<template>
  <section class="resource-page task-management-page">
    <header class="resource-page__header task-management-header">
      <div><p class="page-eyebrow">TASK CONTROL</p><h1>任务管理</h1></div>
      <div class="task-header-controls"><label class="overview-date-filter"><span>时间范围</span><select v-model="dateFilter"><option>今日</option><option>近 7 天</option><option>近 30 天</option><option>全部日期</option></select></label><button class="resource-primary-action dispatch-settings-trigger" type="button" @click="dispatchOpen = true">调度策略</button></div>
    </header>

    <div class="task-control-deck">
      <section class="task-overview" aria-label="任务总览">
        <div class="task-overview__metrics">
          <article><small>任务总数</small><strong>{{ dateScopedTasks.length }}</strong></article>
          <article class="is-live is-waiting"><small>待调度</small><strong>{{ dateScopedTasks.filter(item => item.active && item.status === '待调度').length }}</strong><em>实时</em></article>
          <article class="is-live"><small>运行中</small><strong>{{ dateScopedTasks.filter(item => item.active && item.status === '运行中').length }}</strong><em>实时</em></article>
          <article class="is-live is-fault"><small>异常</small><strong>{{ dateScopedTasks.filter(item => item.active && item.status === '异常').length }}</strong><em>实时</em></article>
          <article><small>已完成</small><strong>{{ dateScopedTasks.filter(item => item.status === '已完成').length }}</strong></article>
          <article><small>已取消</small><strong>{{ dateScopedTasks.filter(item => item.status === '已取消').length }}</strong></article>
        </div>
      </section>
    </div>

    <div class="resource-toolbar task-management-toolbar">
      <label><span>⌕</span><input v-model="query" placeholder="任务编号、请求设备或 AMR"></label>
      <div><select v-model="statusFilter"><option>全部状态</option><option>进行中</option><option>待调度</option><option>运行中</option><option>异常</option><option>已完成</option><option>已取消</option></select></div>
    </div>
    <div class="resource-table-wrap"><table class="resource-table"><thead><tr><th>任务编号</th><th>任务类型</th><th>请求设备</th><th>执行 AMR</th><th>开始时间</th><th>结束时间</th><th>耗时</th><th>状态 / 结果</th></tr></thead><tbody><tr v-for="item in paginatedTasks" :key="item.id" :class="{ 'active-task-row': item.active }"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.type }}</strong></td><td class="type-data">{{ item.requestDeviceId }}</td><td class="type-data">{{ item.amrId }}</td><td class="type-data">{{ item.requestedAt }}</td><td class="type-data">{{ item.finishedAt }}</td><td class="type-data">{{ item.duration }}</td><td><span class="asset-status" :class="statusClass(item)">{{ item.status }}</span></td></tr></tbody></table><footer class="task-pagination"><span>共 {{ filtered.length }} 条 · 每页 {{ pageSize }} 条</span><nav aria-label="任务列表分页"><button type="button" :disabled="currentPage === 1" aria-label="上一页" @click="currentPage--">‹</button><button v-for="page in pageCount" :key="page" type="button" :class="{ active: currentPage === page }" @click="currentPage = page">{{ page }}</button><button type="button" :disabled="currentPage === pageCount" aria-label="下一页" @click="currentPage++">›</button></nav></footer></div>

    <div v-if="dispatchOpen" class="modal-backdrop" @click.self="dispatchOpen = false">
      <section class="dispatch-dialog" role="dialog" aria-modal="true" aria-labelledby="dispatch-dialog-title">
        <header><div><span>DISPATCH CONTROL</span><strong id="dispatch-dialog-title">调度策略</strong></div><button type="button" aria-label="关闭调度策略" @click="dispatchOpen = false">×</button></header>
        <div class="dispatch-settings-card">
          <label><span>当前策略</span><select v-model="dispatch.strategy"><option>规则优先</option><option>距离优先</option><option>负载均衡</option><option>APS 推荐</option></select></label>
          <label class="aps-control"><span><strong>APS 辅助排程</strong><small>{{ dispatch.apsEnabled ? 'APS 推荐参与车辆选择' : '当前仅使用规则调度' }}</small></span><input v-model="dispatch.apsEnabled" type="checkbox"><i></i></label>
        </div>
        <footer><span>{{ dispatchSaved ? '设置已应用' : '应用后影响待调度任务' }}</span><div><button type="button" @click="dispatchOpen = false">取消</button><button class="primary" type="button" @click="saveDispatch">应用策略</button></div></footer>
      </section>
    </div>
  </section>
</template>
