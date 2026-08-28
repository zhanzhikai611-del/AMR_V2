<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getDispatchRules, updateDispatchRule } from '../api/modules/dispatch'
import { getTwinSnapshot } from '../api/modules/operations'
import { cancelTask, getTaskRecords } from '../api/modules/task-records'
import type { DispatchRule, Task, TaskRecord } from '../types/domain'

type CenterTab = 'live' | 'settings' | 'records'
type SelectedTask = { kind: 'live'; task: Task } | { kind: 'record'; task: TaskRecord }

const activeTasks = ref<Task[]>([])
const records = ref<TaskRecord[]>([])
const dispatchRules = ref<DispatchRule[]>([])
const activeTab = ref<CenterTab>('live')
const liveQuery = ref('')
const liveStatus = ref('全部状态')
const ruleQuery = ref('')
const recordQuery = ref('')
const recordStatus = ref('全部结果')
const dateFilter = ref('近 7 天')
const liveCurrentPage = ref(1)
const currentPage = ref(1)
const pageSize = 10
const selected = ref<SelectedTask | null>(null)
const editingRule = ref<DispatchRule | null>(null)
const ruleSaving = ref(false)
const cancelTarget = ref<Task | null>(null)
const canceling = ref(false)
const cancelError = ref('')

const runningCount = computed(() => activeTasks.value.filter((task) => task.status === '运行中').length)
const abnormalCount = computed(() => activeTasks.value.filter((task) => task.status === '异常').length)

const filteredLiveTasks = computed(() => activeTasks.value.filter((task) => {
  const matchesQuery = `${task.id}${task.type}${task.requestDeviceId}${task.amrId ?? ''}${task.phase}`.toLowerCase().includes(liveQuery.value.toLowerCase())
  const matchesStatus = liveStatus.value === '全部状态' || task.status === liveStatus.value
  return matchesQuery && matchesStatus
}))

const filteredRules = computed(() => dispatchRules.value.filter((rule) =>
  `${rule.taskType}${rule.strategy}`.toLowerCase().includes(ruleQuery.value.toLowerCase()),
))

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
  if (status === '异常') return 'fault'
  return 'running'
}

function selectLiveTask(task: Task) { selected.value = { kind: 'live', task } }
function selectRecord(task: TaskRecord) { selected.value = { kind: 'record', task } }

function editRule(rule: DispatchRule) {
  editingRule.value = { ...rule }
}

async function saveRule() {
  if (!editingRule.value || ruleSaving.value) return
  ruleSaving.value = true
  const saved = await updateDispatchRule({ ...editingRule.value, updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }) })
  const index = dispatchRules.value.findIndex((rule) => rule.id === saved.id)
  if (index >= 0) dispatchRules.value[index] = saved
  ruleSaving.value = false
  editingRule.value = null
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
  const [history, snapshot, rules] = await Promise.all([getTaskRecords(), getTwinSnapshot(), getDispatchRules()])
  records.value = history
  activeTasks.value = snapshot.tasks
  dispatchRules.value = rules
})
</script>

<template>
  <section class="resource-page dispatch-center-page">
    <header class="resource-page__header dispatch-center-header">
      <div><p class="page-eyebrow">DISPATCH CENTER</p><h1>派单中心</h1></div>
    </header>

    <nav class="dispatch-center-tabs" aria-label="派单中心视图">
      <button type="button" :class="{ active: activeTab === 'live' }" @click="activeTab = 'live'">实时派单</button>
      <button type="button" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">任务设置</button>
      <button type="button" :class="{ active: activeTab === 'records' }" @click="activeTab = 'records'">派单记录</button>
    </nav>

    <template v-if="activeTab === 'live'">
      <section class="dispatch-summary" aria-label="实时任务摘要">
        <article class="fault"><span>异常</span><strong>{{ abnormalCount }}</strong></article>
        <article class="running"><span>执行中</span><strong>{{ runningCount }}</strong></article>
        <article><span>当前任务</span><strong>{{ activeTasks.length }}</strong></article>
      </section>
      <section class="dispatch-list-panel">
        <div class="dispatch-toolbar">
          <label><span>⌕</span><input v-model="liveQuery" placeholder="搜索任务、设备、AMR 或当前阶段"></label>
          <select v-model="liveStatus" aria-label="筛选实时任务状态"><option>全部状态</option><option>运行中</option><option>异常</option></select>
        </div>
        <div class="resource-table-wrap dispatch-table-wrap">
          <table class="resource-table dispatch-table">
            <thead><tr><th>任务</th><th>请求设备</th><th>执行 AMR</th><th>当前阶段</th><th>执行时长</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="task in paginatedLiveTasks" :key="task.id" tabindex="0" @click="selectLiveTask(task)" @keydown.enter="selectLiveTask(task)">
                <td><strong>{{ task.id }}</strong><small>{{ task.type }}</small></td><td class="type-data">{{ task.requestDeviceId }}</td><td class="type-data">{{ task.amrId ?? '待分配' }}</td><td>{{ task.phase }}</td><td class="type-data">{{ task.duration }}</td><td><span class="asset-status" :class="statusClass(task.status)">{{ task.status }}</span></td><td><button class="task-cancel-button" type="button" :aria-label="`取消任务 ${task.id}`" @click.stop="requestCancel(task)">取消</button></td>
              </tr>
            </tbody>
          </table>
          <div v-if="!filteredLiveTasks.length" class="dispatch-empty"><strong>没有符合条件的实时任务</strong><span>清除筛选条件后查看全部任务</span></div>
          <footer class="task-pagination"><span>共 {{ filteredLiveTasks.length }} 条 · 每页 {{ pageSize }} 条</span><nav aria-label="实时任务分页"><button type="button" :disabled="liveCurrentPage === 1" aria-label="上一页" @click="liveCurrentPage--">‹</button><button v-for="page in livePageCount" :key="page" type="button" :class="{ active: liveCurrentPage === page }" @click="liveCurrentPage = page">{{ page }}</button><button type="button" :disabled="liveCurrentPage === livePageCount" aria-label="下一页" @click="liveCurrentPage++">›</button></nav></footer>
        </div>
      </section>
    </template>

    <template v-else-if="activeTab === 'settings'">
      <section class="dispatch-list-panel settings-list-panel">
        <div class="dispatch-toolbar settings-toolbar"><label><span>⌕</span><input v-model="ruleQuery" placeholder="搜索任务类型或调度策略"></label></div>
        <div class="resource-table-wrap dispatch-table-wrap">
          <table class="resource-table dispatch-table dispatch-rules-table">
            <thead><tr><th>任务类型</th><th>调度策略</th><th>APS</th><th>修改时间</th><th>操作</th></tr></thead>
            <tbody><tr v-for="rule in filteredRules" :key="rule.id"><td><strong>{{ rule.taskType }}</strong></td><td>{{ rule.strategy }}</td><td><span class="rule-aps" :class="{ active: rule.apsEnabled }">{{ rule.apsEnabled ? '开启' : '关闭' }}</span></td><td class="type-data">{{ rule.updatedAt }}</td><td><button class="table-action" type="button" @click="editRule(rule)">编辑</button></td></tr></tbody>
          </table>
          <div v-if="!filteredRules.length" class="dispatch-empty"><strong>没有符合条件的任务设置</strong><span>尝试搜索其他任务类型或策略</span></div>
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
                <div><dt>执行 AMR</dt><dd class="type-data">{{ selected.task.amrId ?? '待分配' }}</dd></div>
                <div><dt>当前阶段</dt><dd>{{ selected.task.phase }}</dd></div>
                <div><dt>执行时长</dt><dd class="type-data">{{ selected.task.duration }}</dd></div>
              </dl>
              <footer><div><span>任务进度</span><strong class="type-data">{{ selected.task.progress }}%</strong></div><i><b :style="{ width: `${selected.task.progress}%` }"></b></i></footer>
            </section>

            <section class="task-detail-process">
              <header><div><span>执行过程</span><strong>{{ selected.task.behaviorName }}</strong></div><em>{{ selected.task.behaviorVersion }}</em></header>
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
                <div><dt>开始时间</dt><dd class="type-data">{{ selected.task.requestedAt }}</dd></div>
                <div><dt>结束时间</dt><dd class="type-data">{{ selected.task.finishedAt }}</dd></div>
              </dl>
              <footer class="record-duration"><span>任务耗时</span><strong class="type-data">{{ selected.task.duration }}</strong></footer>
            </section>

            <section class="task-detail-process record-process">
              <header><div><span>任务过程</span><strong>{{ selected.task.behaviorName }}</strong></div><em>{{ selected.task.behaviorVersion }}</em></header>
              <ol class="record-lifecycle">
                <li class="success"><i></i><div><strong>任务创建</strong><time class="type-data">{{ selected.task.requestedAt }}</time></div></li>
                <li :class="selected.task.result === '已完成' ? 'success' : 'canceled'"><i></i><div><strong>{{ selected.task.result }}</strong><time class="type-data">{{ selected.task.finishedAt }}</time></div></li>
              </ol>
              <p class="task-result-summary" :class="{ canceled: selected.task.result === '已取消' }">{{ selected.task.summary }}</p>
            </section>
          </template>
        </div>

        <footer><button type="button" @click="selected = null">关闭</button></footer>
      </aside>
    </div>

    <div v-if="cancelTarget" class="modal-backdrop" @click.self="cancelTarget = null"><section class="dispatch-dialog cancel-task-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-task-dialog-title"><header><div><span>TASK CONTROL</span><strong id="cancel-task-dialog-title">取消任务</strong></div><button type="button" aria-label="关闭取消任务确认" @click="cancelTarget = null">×</button></header><div class="cancel-task-dialog__body"><strong>{{ cancelTarget.id }}</strong><dl><div><dt>任务类型</dt><dd>{{ cancelTarget.type }}</dd></div><div><dt>请求设备</dt><dd>{{ cancelTarget.requestDeviceId }}</dd></div><div><dt>执行 AMR</dt><dd>{{ cancelTarget.amrId ?? '待分配' }}</dd></div><div><dt>当前状态</dt><dd>{{ cancelTarget.status }}</dd></div></dl><p v-if="cancelError">{{ cancelError }}</p></div><footer><span>取消后任务将进入派单记录</span><div><button type="button" :disabled="canceling" @click="cancelTarget = null">返回</button><button class="danger" type="button" :disabled="canceling" @click="confirmCancel">{{ canceling ? '取消中' : '确认取消' }}</button></div></footer></section></div>

    <div v-if="editingRule" class="modal-backdrop" @click.self="editingRule = null"><section class="dispatch-dialog dispatch-rule-dialog" role="dialog" aria-modal="true" aria-labelledby="dispatch-rule-dialog-title"><header><strong id="dispatch-rule-dialog-title">编辑调度策略</strong><button type="button" aria-label="关闭任务设置" @click="editingRule = null">×</button></header><div class="dispatch-rule-form"><div class="rule-form-row"><span>任务类型</span><strong>{{ editingRule.taskType }}</strong></div><label class="rule-form-row"><span>调度策略</span><select v-model="editingRule.strategy"><option>先进先出</option><option>最短距离</option><option>最短时间</option><option>提前叫料</option><option>负载均衡</option></select></label><label class="rule-form-row rule-form-switch"><span>APS</span><input v-model="editingRule.apsEnabled" type="checkbox"><b>{{ editingRule.apsEnabled ? '开启' : '关闭' }}</b></label></div><footer><div><button type="button" :disabled="ruleSaving" @click="editingRule = null">取消</button><button class="primary" type="button" :disabled="ruleSaving" @click="saveRule">{{ ruleSaving ? '保存中' : '保存' }}</button></div></footer></section></div>
  </section>
</template>
