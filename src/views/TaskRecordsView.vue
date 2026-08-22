<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getDispatchSettings, updateDispatchSettings } from '../api/modules/dispatch'
import { getTwinSnapshot } from '../api/modules/operations'
import { cancelTask, getTaskRecords } from '../api/modules/task-records'
import type { DispatchSettings, Task, TaskRecord } from '../types/domain'

type CenterTab = 'live' | 'records'
type SelectedTask = { kind: 'live'; task: Task } | { kind: 'record'; task: TaskRecord }

const activeTasks = ref<Task[]>([])
const records = ref<TaskRecord[]>([])
const activeTab = ref<CenterTab>('live')
const liveQuery = ref('')
const liveStatus = ref('全部状态')
const recordQuery = ref('')
const recordStatus = ref('全部结果')
const dateFilter = ref('近 7 天')
const liveCurrentPage = ref(1)
const currentPage = ref(1)
const pageSize = 10
const selected = ref<SelectedTask | null>(null)
const dispatch = ref<DispatchSettings>({ strategy: 'FIFO 先进先出', apsEnabled: false, updatedAt: '' })
const dispatchOpen = ref(false)
const dispatchSaved = ref(false)
const cancelTarget = ref<Task | null>(null)
const canceling = ref(false)
const cancelError = ref('')

const waitingCount = computed(() => activeTasks.value.filter((task) => task.status === '待调度' || task.status === '等待中').length)
const runningCount = computed(() => activeTasks.value.filter((task) => task.status === '运行中').length)
const abnormalCount = computed(() => activeTasks.value.filter((task) => task.status === '异常').length)

const filteredLiveTasks = computed(() => activeTasks.value.filter((task) => {
  const matchesQuery = `${task.id}${task.type}${task.requestDeviceId}${task.amrId ?? ''}${task.phase}`.toLowerCase().includes(liveQuery.value.toLowerCase())
  const matchesStatus = liveStatus.value === '全部状态'
    || (liveStatus.value === '等待任务' && (task.status === '待调度' || task.status === '等待中'))
    || task.status === liveStatus.value
  return matchesQuery && matchesStatus
}))

const livePageCount = computed(() => Math.max(1, Math.ceil(filteredLiveTasks.value.length / pageSize)))
const paginatedLiveTasks = computed(() => filteredLiveTasks.value.slice((liveCurrentPage.value - 1) * pageSize, liveCurrentPage.value * pageSize))

const filteredRecords = computed(() => records.value.filter((task) => {
  const matchesQuery = `${task.id}${task.type}${task.requestDeviceId}${task.amrId}`.toLowerCase().includes(recordQuery.value.toLowerCase())
  const matchesStatus = recordStatus.value === '全部结果' || task.result === recordStatus.value
  const taskDate = new Date(task.requestedAt.replace(' ', 'T')).getTime()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = dateFilter.value === '今日' ? 0 : dateFilter.value === '近 7 天' ? 6 : dateFilter.value === '近 30 天' ? 29 : null
  const cutoff = days === null ? 0 : today.getTime() - days * 24 * 60 * 60 * 1000
  return matchesQuery && matchesStatus && taskDate >= cutoff
}))

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize)))
const paginatedRecords = computed(() => filteredRecords.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))

watch([recordQuery, recordStatus, dateFilter], () => { currentPage.value = 1 })
watch(pageCount, (count) => { if (currentPage.value > count) currentPage.value = count })
watch([liveQuery, liveStatus], () => { liveCurrentPage.value = 1 })
watch(livePageCount, (count) => { if (liveCurrentPage.value > count) liveCurrentPage.value = count })

function statusClass(status: Task['status'] | TaskRecord['result']) {
  if (status === '已完成') return 'success'
  if (status === '已取消') return 'neutral'
  if (status === '待调度' || status === '等待中') return 'waiting'
  if (status === '异常') return 'fault'
  return 'running'
}

function selectLiveTask(task: Task) {
  selected.value = { kind: 'live', task }
}

function selectRecord(task: TaskRecord) {
  selected.value = { kind: 'record', task }
}

async function saveDispatch() {
  dispatch.value = await updateDispatchSettings({
    ...dispatch.value,
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  dispatchSaved.value = true
  window.setTimeout(() => { dispatchSaved.value = false }, 1800)
  dispatchOpen.value = false
}

function requestCancel(task: Task) {
  cancelTarget.value = task
  cancelError.value = ''
}

async function confirmCancel() {
  if (!cancelTarget.value || canceling.value) return
  canceling.value = true
  cancelError.value = ''
  try {
    const canceledTaskId = cancelTarget.value.id
    const record = await cancelTask(canceledTaskId)
    activeTasks.value = activeTasks.value.filter((task) => task.id !== canceledTaskId)
    if (!records.value.some((task) => task.id === record.id)) records.value.unshift(record)
    if (selected.value?.task.id === canceledTaskId) selected.value = null
    cancelTarget.value = null
  } catch (reason) {
    cancelError.value = reason instanceof Error ? reason.message : '取消任务失败'
  } finally {
    canceling.value = false
  }
}

onMounted(async () => {
  const [history, snapshot, settings] = await Promise.all([getTaskRecords(), getTwinSnapshot(), getDispatchSettings()])
  records.value = history
  activeTasks.value = snapshot.tasks
  dispatch.value = settings
})
</script>

<template>
  <section class="resource-page dispatch-center-page">
    <header class="resource-page__header dispatch-center-header">
      <div>
        <p class="page-eyebrow">DISPATCH CENTER</p>
        <h1>派单中心</h1>
      </div>
      <button class="dispatch-strategy-button" type="button" @click="dispatchOpen = true">
        <span>调度策略</span>
        <strong>{{ dispatch.strategy }} · APS {{ dispatch.apsEnabled ? '开启' : '关闭' }}</strong>
        <i>⌄</i>
      </button>
    </header>

    <nav class="dispatch-center-tabs" aria-label="派单中心视图">
      <button type="button" :class="{ active: activeTab === 'live' }" @click="activeTab = 'live'">实时派单</button>
      <button type="button" :class="{ active: activeTab === 'records' }" @click="activeTab = 'records'">任务记录</button>
    </nav>

    <template v-if="activeTab === 'live'">
      <section class="dispatch-summary" aria-label="实时任务摘要">
        <article class="fault"><span>异常</span><strong>{{ abnormalCount }}</strong></article>
        <article class="waiting"><span>待调度</span><strong>{{ waitingCount }}</strong></article>
        <article class="running"><span>执行中</span><strong>{{ runningCount }}</strong></article>
        <article><span>当前任务</span><strong>{{ activeTasks.length }}</strong></article>
      </section>

      <section class="dispatch-list-panel">
        <div class="dispatch-toolbar">
          <label><span>⌕</span><input v-model="liveQuery" placeholder="搜索任务、设备、AMR 或当前阶段"></label>
          <select v-model="liveStatus" aria-label="筛选实时任务状态">
            <option>全部状态</option><option>等待任务</option><option>待调度</option><option>运行中</option><option>等待中</option><option>异常</option>
          </select>
        </div>

        <div class="resource-table-wrap dispatch-table-wrap">
          <table class="resource-table dispatch-table">
            <thead><tr><th>任务</th><th>请求设备</th><th>执行 AMR</th><th>当前阶段</th><th>等待 / 执行时长</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="task in paginatedLiveTasks" :key="task.id" tabindex="0" @click="selectLiveTask(task)" @keydown.enter="selectLiveTask(task)">
                <td><strong>{{ task.id }}</strong><small>{{ task.type }}</small></td>
                <td class="type-data">{{ task.requestDeviceId }}</td>
                <td class="type-data">{{ task.amrId ?? '待分配' }}</td>
                <td>{{ task.phase }}</td>
                <td class="type-data">{{ task.duration }}</td>
                <td><span class="asset-status" :class="statusClass(task.status)">{{ task.status }}</span></td>
                <td><button class="task-cancel-button" type="button" :aria-label="`取消任务 ${task.id}`" @click.stop="requestCancel(task)">取消</button></td>
              </tr>
            </tbody>
          </table>
          <div v-if="!filteredLiveTasks.length" class="dispatch-empty"><strong>没有符合条件的实时任务</strong><span>清除筛选条件后查看全部任务</span></div>
          <footer class="task-pagination">
            <span>共 {{ filteredLiveTasks.length }} 条 · 每页 {{ pageSize }} 条</span>
            <nav aria-label="实时任务分页">
              <button type="button" :disabled="liveCurrentPage === 1" aria-label="上一页" @click="liveCurrentPage--">‹</button>
              <button v-for="page in livePageCount" :key="page" type="button" :class="{ active: liveCurrentPage === page }" @click="liveCurrentPage = page">{{ page }}</button>
              <button type="button" :disabled="liveCurrentPage === livePageCount" aria-label="下一页" @click="liveCurrentPage++">›</button>
            </nav>
          </footer>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="dispatch-list-panel record-list-panel">
        <div class="dispatch-toolbar record-toolbar">
          <label><span>⌕</span><input v-model="recordQuery" placeholder="搜索任务编号、设备或 AMR"></label>
          <div>
            <select v-model="dateFilter" aria-label="筛选任务时间"><option>今日</option><option>近 7 天</option><option>近 30 天</option><option>全部日期</option></select>
            <select v-model="recordStatus" aria-label="筛选任务结果"><option>全部结果</option><option>已完成</option><option>已取消</option></select>
          </div>
        </div>
        <div class="resource-table-wrap dispatch-table-wrap">
          <table class="resource-table dispatch-table record-table">
            <thead><tr><th>任务</th><th>请求设备</th><th>执行 AMR</th><th>开始时间</th><th>结束时间</th><th>耗时</th><th>结果</th></tr></thead>
            <tbody>
              <tr v-for="task in paginatedRecords" :key="task.id" tabindex="0" @click="selectRecord(task)" @keydown.enter="selectRecord(task)">
                <td><strong>{{ task.id }}</strong><small>{{ task.type }}</small></td>
                <td class="type-data">{{ task.requestDeviceId }}</td>
                <td class="type-data">{{ task.amrId }}</td>
                <td class="type-data">{{ task.requestedAt }}</td>
                <td class="type-data">{{ task.finishedAt }}</td>
                <td class="type-data">{{ task.duration }}</td>
                <td><span class="asset-status" :class="statusClass(task.result)">{{ task.result }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-if="!paginatedRecords.length" class="dispatch-empty"><strong>没有符合条件的任务记录</strong><span>调整时间或结果筛选后重试</span></div>
          <footer class="task-pagination">
            <span>共 {{ filteredRecords.length }} 条 · 每页 {{ pageSize }} 条</span>
            <nav aria-label="任务记录分页">
              <button type="button" :disabled="currentPage === 1" aria-label="上一页" @click="currentPage--">‹</button>
              <button v-for="page in pageCount" :key="page" type="button" :class="{ active: currentPage === page }" @click="currentPage = page">{{ page }}</button>
              <button type="button" :disabled="currentPage === pageCount" aria-label="下一页" @click="currentPage++">›</button>
            </nav>
          </footer>
        </div>
      </section>
    </template>

    <div v-if="selected" class="task-detail-backdrop" @click.self="selected = null">
      <aside class="task-detail-drawer" aria-label="任务详情">
        <header>
          <div><small>{{ selected.kind === 'live' ? '实时任务' : '任务记录' }}</small><strong>{{ selected.task.id }}</strong><span>{{ selected.task.type }}</span></div>
          <button type="button" aria-label="关闭任务详情" @click="selected = null">×</button>
        </header>
        <section>
          <h2>基本信息</h2>
          <dl>
            <div><dt>请求设备</dt><dd>{{ selected.task.requestDeviceId }}</dd></div>
            <div><dt>执行 AMR</dt><dd>{{ selected.task.amrId ?? '待分配' }}</dd></div>
            <template v-if="selected.kind === 'live'">
              <div><dt>当前状态</dt><dd><span class="asset-status" :class="statusClass(selected.task.status)">{{ selected.task.status }}</span></dd></div>
              <div><dt>当前阶段</dt><dd>{{ selected.task.phase }}</dd></div>
              <div><dt>等待 / 执行时长</dt><dd class="type-data">{{ selected.task.duration }}</dd></div>
            </template>
            <template v-else>
              <div><dt>任务结果</dt><dd><span class="asset-status" :class="statusClass(selected.task.result)">{{ selected.task.result }}</span></dd></div>
              <div><dt>任务耗时</dt><dd class="type-data">{{ selected.task.duration }}</dd></div>
              <div><dt>开始时间</dt><dd class="type-data">{{ selected.task.requestedAt }}</dd></div>
              <div><dt>结束时间</dt><dd class="type-data">{{ selected.task.finishedAt }}</dd></div>
            </template>
          </dl>
        </section>
        <section>
          <h2>{{ selected.kind === 'live' ? '执行信息' : '结果说明' }}</h2>
          <template v-if="selected.kind === 'live'">
            <div class="task-behavior-summary"><span>行为树</span><strong>{{ selected.task.behaviorName }}</strong><small>{{ selected.task.behaviorVersion }}</small></div>
            <ol class="task-event-list">
              <li v-for="event in selected.task.events" :key="event.id" :class="event.tone"><time>{{ event.time }}</time><span>{{ event.label }}</span></li>
            </ol>
          </template>
          <p v-else class="task-result-summary">{{ selected.task.summary }}</p>
        </section>
        <footer><button type="button" @click="selected = null">关闭</button></footer>
      </aside>
    </div>

    <div v-if="cancelTarget" class="modal-backdrop" @click.self="cancelTarget = null">
      <section class="dispatch-dialog cancel-task-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-task-dialog-title">
        <header><div><span>TASK CONTROL</span><strong id="cancel-task-dialog-title">取消任务</strong></div><button type="button" aria-label="关闭取消任务确认" @click="cancelTarget = null">×</button></header>
        <div class="cancel-task-dialog__body">
          <strong>{{ cancelTarget.id }}</strong>
          <dl><div><dt>任务类型</dt><dd>{{ cancelTarget.type }}</dd></div><div><dt>请求设备</dt><dd>{{ cancelTarget.requestDeviceId }}</dd></div><div><dt>执行 AMR</dt><dd>{{ cancelTarget.amrId ?? '待分配' }}</dd></div><div><dt>当前状态</dt><dd>{{ cancelTarget.status }}</dd></div></dl>
          <p v-if="cancelError">{{ cancelError }}</p>
        </div>
        <footer><span>取消后任务将进入任务记录</span><div><button type="button" :disabled="canceling" @click="cancelTarget = null">返回</button><button class="danger" type="button" :disabled="canceling" @click="confirmCancel">{{ canceling ? '取消中' : '确认取消' }}</button></div></footer>
      </section>
    </div>

    <div v-if="dispatchOpen" class="modal-backdrop" @click.self="dispatchOpen = false">
      <section class="dispatch-dialog" role="dialog" aria-modal="true" aria-labelledby="dispatch-dialog-title">
        <header><div><span>DISPATCH CONTROL</span><strong id="dispatch-dialog-title">调度策略</strong></div><button type="button" aria-label="关闭调度策略" @click="dispatchOpen = false">×</button></header>
        <div class="dispatch-settings-card">
          <label><span>当前策略</span><select v-model="dispatch.strategy"><option>FIFO 先进先出</option><option>最短距离</option><option>最短时间</option><option>提前叫料</option><option>负载均衡</option></select></label>
          <label class="aps-control"><span><strong>APS 辅助排程</strong><small>{{ dispatch.apsEnabled ? 'APS 推荐参与任务排序' : '当前仅使用基础调度策略' }}</small></span><input v-model="dispatch.apsEnabled" type="checkbox"><i></i></label>
        </div>
        <footer><span>{{ dispatchSaved ? '设置已应用' : '策略作用于全局任务调度' }}</span><div><button type="button" @click="dispatchOpen = false">取消</button><button class="primary" type="button" @click="saveDispatch">应用策略</button></div></footer>
      </section>
    </div>
  </section>
</template>
