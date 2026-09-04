<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDispatchCenterStore } from '../stores/dispatch-center'
import type { DispatchRule, Task, TaskRecord } from '../types/domain'

type CenterTab = 'live' | 'settings' | 'records'
type SelectedTask = { kind: 'live'; task: Task } | { kind: 'record'; task: TaskRecord }
type LiveListItem = { kind: 'live'; task: Task } | { kind: 'record'; task: TaskRecord }

const center = useDispatchCenterStore()

const activeTab = ref<CenterTab>('live')
const liveQuery = ref('')
const liveStatus = ref('全部状态')
const liveAmr = ref('全部 AMR')
const ruleQuery = ref('')
const recordQuery = ref('')
const recordStatus = ref('全部结果')
const dateFilter = ref('全部日期')
const liveCurrentPage = ref(1)
const currentPage = ref(1)
const pageSize = 10
const selected = ref<SelectedTask | null>(null)
const editingRule = ref<DispatchRule | null>(null)
const ruleSaving = ref(false)

const activeTasks = computed(() => center.tasks)
const records = computed(() => center.records)
const dispatchRules = computed(() => center.rules)

const runningCount = computed(() => center.runningCount)
const abnormalCount = computed(() => center.abnormalCount)
const queuedCount = computed(() => center.queuedCount)
const recentlyFinished = computed(() => center.recentlyFinished)

const filteredLiveItems = computed<LiveListItem[]>(() => {
  const query = liveQuery.value.toLowerCase()
  const active: LiveListItem[] = activeTasks.value
    .filter((task) => {
      const matchesQuery = `${task.id}${task.type}${task.requestDeviceId}${task.amrId}${task.priority}`.toLowerCase().includes(query)
      const matchesStatus = liveStatus.value === '全部状态' || task.status === liveStatus.value
      const matchesAmr = liveAmr.value === '全部 AMR' || task.amrId === liveAmr.value
      return matchesQuery && matchesStatus && matchesAmr
    })
    .map((task) => ({ kind: 'live', task }))
  const finished: LiveListItem[] = liveStatus.value === '全部状态'
    ? recentlyFinished.value
      .filter((task) => `${task.id}${task.type}${task.requestDeviceId}${task.amrId}`.toLowerCase().includes(query)
        && (liveAmr.value === '全部 AMR' || task.amrId === liveAmr.value))
      .map((task) => ({ kind: 'record', task }))
    : []
  return [...active, ...finished].sort((a, b) => {
    const queueOrder = (item: LiveListItem) => item.kind === 'record'
      ? 0
      : item.task.status === '待执行'
        ? (center.queuePosition(item.task.id) ?? Number.MAX_SAFE_INTEGER)
        : 0
    const queueDifference = queueOrder(a) - queueOrder(b)
    if (queueDifference !== 0) return queueDifference
    const aTime = a.kind === 'live' ? a.task.createdAt : a.task.requestedAt
    const bTime = b.kind === 'live' ? b.task.createdAt : b.task.requestedAt
    return aTime.localeCompare(bTime)
  })
})

const filteredRules = computed(() => dispatchRules.value.filter((rule) =>
  `${rule.taskType}${rule.strategy}${rule.defaultPriority}`.toLowerCase().includes(ruleQuery.value.toLowerCase()),
))

const livePageCount = computed(() => Math.max(1, Math.ceil(filteredLiveItems.value.length / pageSize)))
const paginatedLiveItems = computed(() => filteredLiveItems.value.slice((liveCurrentPage.value - 1) * pageSize, liveCurrentPage.value * pageSize))

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
watch([liveQuery, liveStatus, liveAmr], () => { liveCurrentPage.value = 1 })
watch(livePageCount, (count) => { if (liveCurrentPage.value > count) liveCurrentPage.value = count })

function statusClass(status: Task['status'] | TaskRecord['result']) {
  if (status === '已完成') return 'success'
  if (status === '已取消') return 'neutral'
  if (status === '异常') return 'fault'
  if (status === '待执行') return 'pending'
  return 'running'
}

function queueLabel(task: Task): string {
  if (task.status === '执行中') return `执行中 · ${task.progress}%`
  if (task.status === '异常') return `阻塞 · ${task.progress}%`
  const position = center.queuePosition(task.id)
  return position ? `第 ${position} 位` : '待执行'
}

function selectLiveTask(task: Task) { selected.value = { kind: 'live', task } }
function selectRecord(task: TaskRecord) { selected.value = { kind: 'record', task } }

function filterFromSummary(status: Task['status'] | '全部状态') {
  liveStatus.value = status === '全部状态' || liveStatus.value === status ? '全部状态' : status
}

function editRule(rule: DispatchRule) {
  editingRule.value = { ...rule }
}

async function saveRule() {
  if (!editingRule.value || ruleSaving.value) return
  ruleSaving.value = true
  const saved = await center.saveRule(editingRule.value)
  ruleSaving.value = false
  editingRule.value = null
  void saved
}

onMounted(async () => {
  await center.load()
  center.start()
})

onBeforeUnmount(() => center.stop())
</script>

<template>
  <section class="resource-page dispatch-center-page">
    <header class="resource-page__header dispatch-center-header">
      <div><p class="page-eyebrow">DISPATCH CENTER</p><h1>派单中心</h1></div>
    </header>

    <nav class="dispatch-center-tabs" aria-label="派单中心视图">
      <button type="button" :class="{ active: activeTab === 'live' }" @click="activeTab = 'live'">实时派单</button>
      <button type="button" :class="{ active: activeTab === 'records' }" @click="activeTab = 'records'">派单记录</button>
      <button type="button" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">派单设置</button>
    </nav>

    <template v-if="activeTab === 'live'">
      <section class="dispatch-summary" aria-label="实时任务摘要">
        <article class="fault" :class="{ active: liveStatus === '异常' }" role="button" tabindex="0" :aria-pressed="liveStatus === '异常'" @click="filterFromSummary('异常')" @keydown.enter.prevent="filterFromSummary('异常')" @keydown.space.prevent="filterFromSummary('异常')"><span>异常</span><strong>{{ abnormalCount }}</strong></article>
        <article class="pending" :class="{ active: liveStatus === '待执行' }" role="button" tabindex="0" :aria-pressed="liveStatus === '待执行'" @click="filterFromSummary('待执行')" @keydown.enter.prevent="filterFromSummary('待执行')" @keydown.space.prevent="filterFromSummary('待执行')"><span>待执行</span><strong>{{ queuedCount }}</strong></article>
        <article class="running" :class="{ active: liveStatus === '执行中' }" role="button" tabindex="0" :aria-pressed="liveStatus === '执行中'" @click="filterFromSummary('执行中')" @keydown.enter.prevent="filterFromSummary('执行中')" @keydown.space.prevent="filterFromSummary('执行中')"><span>执行中</span><strong>{{ runningCount }}</strong></article>
        <article :class="{ active: liveStatus === '全部状态' }" role="button" tabindex="0" :aria-pressed="liveStatus === '全部状态'" @click="filterFromSummary('全部状态')" @keydown.enter.prevent="filterFromSummary('全部状态')" @keydown.space.prevent="filterFromSummary('全部状态')"><span>当前任务</span><strong>{{ activeTasks.length }}</strong></article>
      </section>
      <section class="dispatch-list-panel">
        <div class="dispatch-toolbar">
          <label><span>⌕</span><input v-model="liveQuery" placeholder="搜索任务、设备或 AMR"></label>
          <div class="live-filter-group"><select v-model="liveAmr" aria-label="筛选 AMR"><option>全部 AMR</option><option v-for="amr in center.amrs" :key="amr.id" :value="amr.id">{{ amr.id }}</option></select><select v-model="liveStatus" aria-label="筛选实时任务状态"><option>全部状态</option><option>待执行</option><option>执行中</option><option>异常</option></select></div>
        </div>
        <div class="resource-table-wrap dispatch-table-wrap">
          <table class="resource-table dispatch-table">
            <thead><tr><th>任务</th><th>请求设备</th><th>执行 AMR</th><th>队列 / 进度</th><th>任务发起时间</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="item in paginatedLiveItems" :key="item.task.id" :class="{ 'abnormal-progress-row': item.kind === 'live' && item.task.status === '异常', 'recent-finished-row': item.kind === 'record', 'recent-completed-row': item.kind === 'record' && item.task.result === '已完成', 'recent-canceled-row': item.kind === 'record' && item.task.result === '已取消' }" tabindex="0" @click="item.kind === 'live' ? selectLiveTask(item.task) : selectRecord(item.task)" @keydown.enter="item.kind === 'live' ? selectLiveTask(item.task) : selectRecord(item.task)">
                <td><strong>{{ item.task.id }}</strong><small>{{ item.task.type }}</small></td>
                <td class="type-data">{{ item.task.requestDeviceId }}</td><td class="type-data"><span>{{ item.task.amrId }}</span></td>
                <td><span v-if="item.kind === 'live'" class="queue-position" :class="{ active: item.task.status === '执行中', blocked: item.task.status === '异常' }">{{ queueLabel(item.task) }}</span><span v-else class="type-data task-not-applicable">—</span></td>
                <td class="type-data task-created-at">{{ item.kind === 'live' ? item.task.createdAt : item.task.requestedAt }}</td><td><span class="asset-status" :class="statusClass(item.kind === 'live' ? item.task.status : item.task.result)">{{ item.kind === 'live' ? item.task.status : item.task.result }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-if="!filteredLiveItems.length" class="dispatch-empty"><strong>没有符合条件的实时任务</strong><span>清除筛选条件后查看全部任务</span></div>
          <footer class="task-pagination"><span>共 {{ filteredLiveItems.length }} 条 · 每页 {{ pageSize }} 条</span><nav aria-label="实时任务分页"><button type="button" :disabled="liveCurrentPage === 1" aria-label="上一页" @click="liveCurrentPage--">‹</button><button v-for="page in livePageCount" :key="page" type="button" :class="{ active: liveCurrentPage === page }" @click="liveCurrentPage = page">{{ page }}</button><button type="button" :disabled="liveCurrentPage === livePageCount" aria-label="下一页" @click="liveCurrentPage++">›</button></nav></footer>
        </div>
      </section>
    </template>

    <template v-else-if="activeTab === 'settings'">
      <section class="dispatch-list-panel settings-list-panel">
        <div class="dispatch-toolbar settings-toolbar"><label><span>⌕</span><input v-model="ruleQuery" placeholder="搜索任务类型或调度策略"></label><span class="settings-hint">任务类型由系统自动同步，此处调整选车策略、默认优先级与 APS</span></div>
        <div class="resource-table-wrap dispatch-table-wrap">
          <table class="resource-table dispatch-table dispatch-rules-table">
            <thead><tr><th>任务类型</th><th>调度策略</th><th>默认优先级</th><th>APS</th><th>修改时间</th><th>操作</th></tr></thead>
            <tbody><tr v-for="rule in filteredRules" :key="rule.id"><td><strong>{{ rule.taskType }}</strong></td><td>{{ rule.strategy }}</td><td><span class="task-priority" :class="{ high: rule.defaultPriority === '高' }">{{ rule.defaultPriority }}</span></td><td><span class="rule-aps" :class="{ active: rule.apsEnabled }">{{ rule.apsEnabled ? '开启' : '关闭' }}</span></td><td class="type-data">{{ rule.updatedAt }}</td><td><button class="table-action" type="button" @click="editRule(rule)">编辑</button></td></tr></tbody>
          </table>
          <div v-if="!filteredRules.length" class="dispatch-empty"><strong>没有符合条件的派单设置</strong><span>尝试搜索其他任务类型或策略</span></div>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="dispatch-list-panel record-list-panel">
        <div class="dispatch-toolbar record-toolbar"><label><span>⌕</span><input v-model="recordQuery" placeholder="搜索任务编号、设备或 AMR"></label><div><select v-model="dateFilter" aria-label="筛选任务时间"><option>今日</option><option>近 7 天</option><option>近 30 天</option><option>全部日期</option></select><select v-model="recordStatus" aria-label="筛选任务结果"><option>全部结果</option><option>已完成</option><option>已取消</option></select></div></div>
        <div class="resource-table-wrap dispatch-table-wrap">
          <table class="resource-table dispatch-table record-table"><thead><tr><th>任务</th><th>请求设备</th><th>执行 AMR</th><th>开始时间</th><th>结束时间</th><th>耗时</th><th>结果</th></tr></thead><tbody><tr v-for="task in paginatedRecords" :key="task.id" tabindex="0" @click="selectRecord(task)" @keydown.enter="selectRecord(task)"><td><strong>{{ task.id }}</strong><small>{{ task.type }}</small></td><td class="type-data">{{ task.requestDeviceId }}</td><td class="type-data">{{ task.amrId }}</td><td class="type-data">{{ task.requestedAt }}</td><td class="type-data">{{ task.finishedAt }}</td><td class="type-data">{{ task.duration }}</td><td><span class="asset-status" :class="statusClass(task.result)">{{ task.result }}</span></td></tr></tbody></table>
          <div v-if="!paginatedRecords.length" class="dispatch-empty"><strong>没有符合条件的派单记录</strong><span>调整时间或结果筛选后重试</span></div>
          <footer class="task-pagination"><span>共 {{ filteredRecords.length }} 条 · 每页 {{ pageSize }} 条</span><nav aria-label="派单记录分页"><button type="button" :disabled="currentPage === 1" aria-label="上一页" @click="currentPage--">‹</button><button v-for="page in pageCount" :key="page" type="button" :class="{ active: currentPage === page }" @click="currentPage = page">{{ page }}</button><button type="button" :disabled="currentPage === pageCount" aria-label="下一页" @click="currentPage++">›</button></nav></footer>
        </div>
      </section>
    </template>

    <div v-if="selected" class="task-detail-backdrop" @click.self="selected = null">
      <aside class="task-detail-drawer" aria-label="任务详情">
        <header>
          <div class="task-detail-heading"><strong class="type-data">{{ selected.task.id }}</strong><span>{{ selected.task.type }}</span></div>
          <button type="button" aria-label="关闭任务详情" @click="selected = null">×</button>
        </header>

        <div class="task-detail-content">
          <template v-if="selected.kind === 'live'">
            <section class="task-detail-overview" :class="{ fault: selected.task.status === '异常' }">
              <header><span>实时任务</span><span class="asset-status" :class="statusClass(selected.task.status)">{{ selected.task.status }}</span></header>
              <dl>
                <div><dt>请求设备</dt><dd class="type-data">{{ selected.task.requestDeviceId }}</dd></div>
                <div><dt>执行 AMR</dt><dd class="type-data">{{ selected.task.amrId }}</dd></div>
                <div><dt>队列 / 进度</dt><dd><b class="queue-position" :class="{ active: selected.task.status === '执行中', blocked: selected.task.status === '异常' }">{{ queueLabel(selected.task) }}</b></dd></div>
                <div><dt>任务发起时间</dt><dd class="type-data">{{ selected.task.createdAt }}</dd></div>
                <div><dt>调度策略</dt><dd>{{ center.strategyLabel(selected.task.type) }}</dd></div>
                <div><dt>优先级</dt><dd><span class="task-priority" :class="{ high: selected.task.priority === '高' }">{{ selected.task.priority }}</span></dd></div>
              </dl>
              <footer><div><span>任务进度</span><strong class="type-data">{{ selected.task.progress }}%</strong></div><i><b :style="{ width: `${selected.task.progress}%` }"></b></i></footer>
            </section>

            <section class="task-detail-process">
              <header><div><strong>执行过程</strong></div></header>
              <ol class="task-detail-steps">
                <li v-for="step in selected.task.behaviorSteps" :key="step.id" :class="step.status">
                  <i><span></span></i>
                  <div><strong>{{ step.name }}</strong><small>{{ step.status === 'running' ? '运行中' : step.status === 'success' ? '已完成' : step.status === 'failure' ? '失败' : '未开始' }}</small><p v-if="step.detail">{{ step.detail }}</p></div>
                  <time v-if="step.status === 'success'" class="type-data">{{ step.duration }}</time>
                </li>
              </ol>
            </section>
          </template>

          <template v-else>
            <section class="task-detail-overview record" :class="{ canceled: selected.task.result === '已取消' }">
              <header><span>派单记录</span><span class="asset-status" :class="statusClass(selected.task.result)">{{ selected.task.result }}</span></header>
              <dl>
                <div><dt>请求设备</dt><dd class="type-data">{{ selected.task.requestDeviceId }}</dd></div>
                <div><dt>执行 AMR</dt><dd class="type-data">{{ selected.task.amrId }}</dd></div>
                <div><dt>调度策略</dt><dd>{{ selected.task.strategy ?? '—' }}</dd></div>
                <div><dt>开始时间</dt><dd class="type-data">{{ selected.task.requestedAt }}</dd></div>
                <div><dt>结束时间</dt><dd class="type-data">{{ selected.task.finishedAt }}</dd></div>
                <div><dt>任务耗时</dt><dd class="type-data">{{ selected.task.duration }}</dd></div>
              </dl>
            </section>

            <section class="task-detail-process record-process">
              <header><div><strong>执行过程</strong></div></header>
              <ol v-if="selected.task.behaviorSteps?.length" class="task-detail-steps">
                <li v-for="step in selected.task.behaviorSteps" :key="step.id" :class="step.id === selected.task.canceledStepId ? 'failure' : step.status">
                  <i><span></span></i>
                  <div>
                    <strong>{{ step.name }}</strong>
                    <small>{{ step.id === selected.task.canceledStepId ? '在此节点取消' : step.status === 'success' ? '已完成' : step.status === 'failure' ? '失败' : step.status === 'skipped' ? '已跳过' : '未执行' }}</small>
                    <p v-if="step.id === selected.task.canceledStepId">{{ selected.task.cancelReason || step.detail || '未提供取消原因' }}<br>取消时间：{{ selected.task.finishedAt }}</p>
                    <p v-else-if="step.detail">{{ step.detail }}</p>
                  </div>
                  <time v-if="step.duration !== '—'" class="type-data">{{ step.duration }}</time>
                </li>
              </ol>
              <p v-else class="task-result-summary">该历史记录未保存执行轨迹，无法还原实际执行节点。</p>
              <p v-if="selected.task.result === '已取消' && !selected.task.canceledStepId" class="task-result-summary canceled">未记录取消节点（可能在执行前结束），不推断中止位置。</p>
              <p class="task-result-summary" :class="{ canceled: selected.task.result === '已取消' }">{{ selected.task.summary }}</p>
            </section>
          </template>
        </div>

        <footer><button type="button" @click="selected = null">关闭</button></footer>
      </aside>
    </div>

    <div v-if="editingRule" class="modal-backdrop" @click.self="editingRule = null"><section class="dispatch-dialog dispatch-rule-dialog" role="dialog" aria-modal="true" aria-labelledby="dispatch-rule-dialog-title"><header><strong id="dispatch-rule-dialog-title">编辑派单设置</strong><button type="button" aria-label="关闭派单设置" @click="editingRule = null">×</button></header><div class="dispatch-rule-form"><div class="rule-form-row"><span>任务类型</span><strong>{{ editingRule.taskType }}</strong></div><label class="rule-form-row"><span>调度策略</span><select v-model="editingRule.strategy"><option>先进先出</option><option>最短距离</option><option>最短时间</option><option>提前叫料</option><option>负载均衡</option></select></label><label class="rule-form-row"><span>默认优先级</span><select v-model="editingRule.defaultPriority"><option>普通</option><option>高</option></select></label><label class="rule-form-row rule-form-switch"><span>APS</span><input v-model="editingRule.apsEnabled" type="checkbox"><b>{{ editingRule.apsEnabled ? '开启' : '关闭' }}</b></label><p class="rule-form-note">新任务创建时立即分配 AMR。默认优先级决定它在该 AMR 待执行队列中的顺序；高优先级优先，同级按创建时间排队，不中断执行中任务。</p></div><footer><div><button type="button" :disabled="ruleSaving" @click="editingRule = null">取消</button><button class="primary" type="button" :disabled="ruleSaving" @click="saveRule">{{ ruleSaving ? '保存中' : '保存' }}</button></div></footer></section></div>
  </section>
</template>
