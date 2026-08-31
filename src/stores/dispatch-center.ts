import { defineStore } from 'pinia'
import { getTwinSnapshot } from '../api/modules/operations'
import { getTaskRecords } from '../api/modules/task-records'
import { getDispatchRules, updateDispatchRule } from '../api/modules/dispatch'
import type { Amr, BehaviorStep, DispatchRule, MapResource, Task, TaskRecord } from '../types/domain'

/** 模拟推进节奏：每 10 秒推进一个 tick，对应执行时长 10 秒。 */
const TICK_MS = 10000
const TICK_SECONDS = 10

const STRATEGY_LABEL: Record<DispatchRule['strategy'], string> = {
  '先进先出': '先进先出',
  '最短距离': '最短距离',
  '最短时间': '最短时间',
  '提前叫料': '提前叫料',
  '负载均衡': '负载均衡',
}

/** 模拟随机生成的新任务模板，类型与任务设置里的规则对齐。 */
const NEW_TASK_TEMPLATES: Array<Pick<Task, 'type' | 'requestDeviceId' | 'behaviorName' | 'behaviorVersion'>> = [
  { type: '设备补料', requestDeviceId: 'D16', behaviorName: '设备补料流程', behaviorVersion: 'v1.0' },
  { type: '设备下料', requestDeviceId: 'C18', behaviorName: '设备下料流程', behaviorVersion: 'v1.0' },
  { type: '成品转运', requestDeviceId: 'D24', behaviorName: '成品转运流程', behaviorVersion: 'v1.0' },
  { type: '半成品转运', requestDeviceId: 'E18', behaviorName: '半成品转运流程', behaviorVersion: 'v1.0' },
]

function createTransferSteps(taskType: string, suffix: string): BehaviorStep[] {
  const names = taskType === '设备补料'
    ? ['前往备料点', '执行上料', '前往目标设备', '执行下料']
    : taskType === '设备下料'
      ? ['前往目标设备', '执行上料', '前往下料点', '执行下料']
      : taskType === '成品转运'
        ? ['前往产出设备', '执行上料', '前往成品下料点', '执行下料']
        : ['前往上游设备', '执行上料', '前往下游设备', '执行下料']
  return names.map((name, index) => ({ id: `n${index + 1}-${suffix}`, name, status: 'pending', duration: '—' }))
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function now(): string {
  return formatDateTime(new Date())
}

/** 把 'MM:SS' 时长累加若干秒，返回新的 'MM:SS'。 */
function addSeconds(duration: string, seconds: number): string {
  const [m = 0, s = 0] = duration.split(':').map(Number)
  const total = m * 60 + s + seconds
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function compareQueueOrder(a: Task, b: Task): number {
  const priorityDifference = (b.priority === '高' ? 1 : 0) - (a.priority === '高' ? 1 : 0)
  if (priorityDifference !== 0) return priorityDifference
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
}

interface DispatchCenterState {
  tasks: Task[]
  records: TaskRecord[]
  rules: DispatchRule[]
  amrs: Amr[]
  resources: MapResource[]
  running: boolean
  tickCount: number
  lastUpdate: string
  seq: number
  abnormalSince: Record<string, number>
  timer: ReturnType<typeof setInterval> | null
}

export const useDispatchCenterStore = defineStore('dispatch-center', {
  state: (): DispatchCenterState => ({
    tasks: [],
    records: [],
    rules: [],
    amrs: [],
    resources: [],
    running: false,
    tickCount: 0,
    lastUpdate: '',
    seq: 0,
    abnormalSince: {},
    timer: null,
  }),

  getters: {
    abnormalCount(state): number {
      return state.tasks.filter((task) => task.status === '异常').length
    },
    runningCount(state): number {
      return state.tasks.filter((task) => task.status === '执行中').length
    },
    queuedCount(state): number {
      return state.tasks.filter((task) => task.status === '待执行').length
    },
    /** 仅作为实时页面的流转回执；已结束任务仍已正式归档，不计入当前任务。 */
    recentlyFinished(state): TaskRecord[] {
      void state.lastUpdate
      const cutoff = Date.now() - 30_000
      return state.records
        .filter((record) => new Date(record.finishedAt.replace(' ', 'T')).getTime() >= cutoff)
        .slice(0, 3)
    },
    queuePosition(state) {
      return (taskId: string): number | null => {
        const task = state.tasks.find((item) => item.id === taskId)
        if (!task || task.status !== '待执行') return null
        const queue = state.tasks
          .filter((item) => item.amrId === task.amrId && item.status === '待执行')
          .sort(compareQueueOrder)
        const index = queue.findIndex((item) => item.id === taskId)
        return index < 0 ? null : index + 1
      }
    },
    /** 取某个任务类型当前生效的调度策略。 */
    strategyFor(state) {
      return (taskType: string): DispatchRule['strategy'] | null => {
        return state.rules.find((rule) => rule.taskType === taskType)?.strategy ?? null
      }
    },
    strategyLabel(): (taskType: string) => string {
      return (taskType: string) => {
        const strategy = this.strategyFor(taskType)
        return strategy ? STRATEGY_LABEL[strategy] : '先进先出'
      }
    },
  },

  actions: {
    async load() {
      const [history, snapshot, rules] = await Promise.all([
        getTaskRecords(),
        getTwinSnapshot(),
        getDispatchRules(),
      ])
      this.records = history
      this.tasks = snapshot.tasks
      this.amrs = snapshot.amrs
      this.resources = snapshot.resources
      this.rules = rules
      this.seq = 0
      this.lastUpdate = snapshot.updatedAt
      this.abnormalSince = {}
      for (const task of this.tasks) {
        if (task.status === '异常') this.abnormalSince[task.id] = 0
      }
    },

    start() {
      if (this.running || this.timer) return
      this.running = true
      this.timer = setInterval(() => this.tick(), TICK_MS)
    },

    stop() {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
      this.running = false
    },

    /** 推进一个模拟 tick：推进执行任务，完成后自动启动同车队列的下一项。 */
    tick() {
      this.tickCount += 1

      // 1. 执行中任务推进进度
      const completed: string[] = []
      for (const task of this.tasks) {
        if (task.status !== '执行中') continue
        task.progress = Math.min(task.progress + (4 + Math.round(Math.random() * 8)), 100)
        task.duration = addSeconds(task.duration, TICK_SECONDS)
        if (task.progress >= 100) completed.push(task.id)
      }
      for (const taskId of completed) this.completeTask(taskId)

      // 2. 仅用于原型演示：异常任务保留 1 个 tick（10 秒）后自动归档为已取消。
      const canceled = this.tasks
        .filter((task) => task.status === '异常' && this.tickCount - (this.abnormalSince[task.id] ?? this.tickCount) >= 1)
        .map((task) => task.id)
      for (const taskId of canceled) this.archiveSimulatedCanceledTask(taskId)

      // 3. 低概率制造一个异常，让"异常"指标保持有内容
      if (Math.random() < 0.1) {
        const candidates = this.tasks.filter((task) => task.status === '执行中')
        if (candidates.length) {
          const target = candidates[Math.floor(Math.random() * candidates.length)]
          target.status = '异常'
          target.phase = '限行区通行等待'
          this.abnormalSince[target.id] = this.tickCount
          target.behaviorSteps = target.behaviorSteps.map((step) =>
            step.status === 'running' ? { ...step, status: 'failure', detail: '限行区通行权申请超时，已重试 3 次' } : step,
          )
        }
      }

      // 4. 持续生成新任务请求，让闭环不断运转
      if (this.tasks.length < 12 && Math.random() < 0.5) this.spawnTask()

      this.lastUpdate = now()
    },

    /** 启动已经绑定 AMR 的任务。 */
    startTask(task: Task, amr: Amr) {
      task.status = '执行中'
      task.phase = task.behaviorSteps.find((step) => step.status === 'pending')?.name ?? '执行任务'
      task.progress = 0
      task.duration = '00:00'
      let activated = false
      task.behaviorSteps = task.behaviorSteps.map((step) => {
        if (!activated && step.status === 'pending') {
          activated = true
          return { ...step, status: 'running' }
        }
        return step
      })
      task.events = [
        ...task.events,
        { id: `ev-${task.id}-start`, time: now().slice(11), label: `${amr.id} 开始执行任务`, type: 'task' },
      ]
      amr.taskId = task.id
      amr.status = '运行'
      amr.tone = 'running'
      amr.speed = 0.6
    },

    /** 当前任务结束后，按“高优先级优先，同级先进先出”启动下一项。 */
    startNextTask(amrId: string) {
      const amr = this.amrs.find((item) => item.id === amrId)
      if (!amr) return
      const next = this.tasks
        .filter((task) => task.amrId === amrId && task.status === '待执行')
        .sort(compareQueueOrder)[0]
      if (next) {
        this.startTask(next, amr)
        return
      }
      amr.taskId = null
      amr.status = '空闲'
      amr.tone = 'idle'
      amr.speed = 0
    },

    /** 根据调度策略选车；正在工作的 AMR 仍可以接收新任务进入队列。 */
    pickAmr(task: Pick<Task, 'type' | 'requestDeviceId'>, strategy: DispatchRule['strategy']): Amr | null {
      const available = this.amrs.filter(
        (amr) =>
          amr.connectionStatus === 'online' &&
          amr.runnable !== false &&
          amr.dispatchStatus !== 'paused' &&
          amr.status !== '停用' &&
          amr.status !== '充电' &&
          amr.status !== '异常' &&
          amr.status !== '离线' &&
          amr.serviceDevices.includes(task.requestDeviceId),
      )
      if (!available.length) return null

      const request = this.resources.find((resource) => resource.id === task.requestDeviceId)

      if (strategy === '最短距离') {
        if (request) {
          return [...available].sort(
            (a, b) => distance(a.position, request.position) - distance(b.position, request.position),
          )[0]
        }
      }

      if (strategy === '最短时间' && request) {
        const workload = (amrId: string) => this.tasks.filter((item) => item.amrId === amrId).length
        return [...available].sort(
          (a, b) => (workload(a.id) * 120 + distance(a.position, request.position))
            - (workload(b.id) * 120 + distance(b.position, request.position)),
        )[0]
      }

      if (strategy === '负载均衡') {
        const load = (amrId: string) => this.tasks.filter((item) => item.amrId === amrId).length
        return [...available].sort((a, b) => load(a.id) - load(b.id))[0]
      }

      // 其他策略在 Mock 中优先选当前工作量最少的车。
      const load = (amrId: string) => this.tasks.filter((item) => item.amrId === amrId).length
      return [...available].sort((a, b) => load(a.id) - load(b.id) || a.id.localeCompare(b.id))[0]
    },

    /** 完成任务：释放 AMR、生成派单记录、从实时列表移除。 */
    completeTask(taskId: string) {
      const index = this.tasks.findIndex((task) => task.id === taskId)
      if (index < 0) return
      const task = this.tasks[index]
      const amrId = task.amrId

      const finishedAt = now()
      const record: TaskRecord = {
        id: task.id,
        type: task.type,
        requestDeviceId: task.requestDeviceId,
        amrId: task.amrId,
        result: '已完成',
        requestedAt: task.createdAt,
        finishedAt,
        duration: task.duration,
        behaviorName: task.behaviorName,
        behaviorVersion: task.behaviorVersion,
        summary: '任务完成，设备请求已满足，资源已释放。',
        strategy: this.strategyLabel(task.type),
      }
      this.tasks.splice(index, 1)
      this.records.unshift(record)
      delete this.abnormalSince[taskId]
      this.startNextTask(amrId)
    },

    /** 原型演示专用：模拟后端将持续 10 秒的异常任务转为已取消。 */
    archiveSimulatedCanceledTask(taskId: string) {
      const index = this.tasks.findIndex((task) => task.id === taskId)
      if (index < 0) return
      const task = this.tasks[index]
      const amrId = task.amrId
      const finishedAt = now()
      const record: TaskRecord = {
        id: task.id,
        type: task.type,
        requestDeviceId: task.requestDeviceId,
        amrId,
        result: '已取消',
        requestedAt: task.createdAt,
        finishedAt,
        duration: task.duration,
        behaviorName: task.behaviorName,
        behaviorVersion: task.behaviorVersion,
        summary: '模拟流转：任务异常持续 10 秒，系统自动归档为已取消。',
        strategy: this.strategyLabel(task.type),
      }
      this.tasks.splice(index, 1)
      this.records.unshift(record)
      delete this.abnormalSince[taskId]
      this.startNextTask(amrId)
    },

    /** 重试异常任务：保持原 AMR 绑定，不重新分配。 */
    retryTask(taskId: string) {
      const task = this.tasks.find((item) => item.id === taskId)
      if (!task || task.status !== '异常') return
      const amr = this.amrs.find((item) => item.id === task.amrId)
      if (!amr) return
      delete this.abnormalSince[taskId]
      task.progress = Math.max(task.progress - 40, 0)
      task.behaviorSteps = task.behaviorSteps.map((step) =>
        step.status === 'failure' ? { ...step, status: 'pending' } : step,
      )
      this.startTask(task, amr)
    },

    /** 随机生成任务：创建时立即分配 AMR，忙碌车辆的任务直接进入待执行队列。 */
    spawnTask() {
      const template = NEW_TASK_TEMPLATES[this.seq % NEW_TASK_TEMPLATES.length]
      this.seq += 1
      const date = new Date()
      const datePart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
      const rule = this.rules.find((item) => item.taskType === template.type)
      const strategy = rule?.strategy ?? '先进先出'
      const amr = this.pickAmr(template, strategy)
      if (!amr) return
      const createdAt = now()
      const task: Task = {
        id: `TSK-${datePart}-${String(100 + this.seq)}`,
        type: template.type,
        amrId: amr.id,
        requestDeviceId: template.requestDeviceId,
        phase: amr.taskId ? '等待前序任务' : '准备执行',
        status: amr.taskId ? '待执行' : '执行中',
        priority: rule?.defaultPriority ?? '普通',
        createdAt,
        duration: '00:00',
        progress: 0,
        behaviorName: template.behaviorName,
        behaviorVersion: template.behaviorVersion,
        behaviorSteps: createTransferSteps(template.type, String(this.seq)),
        events: [
          { id: `ev-${this.seq}-new`, time: createdAt.slice(11), label: `${template.requestDeviceId} 机械手臂上抛${template.type}请求`, type: 'task' },
          { id: `ev-${this.seq}-assigned`, time: createdAt.slice(11), label: `任务已分配 ${amr.id}（按${STRATEGY_LABEL[strategy]}）`, type: 'task' },
        ],
        plannedPath: '',
        traveledPath: '',
      }
      this.tasks.unshift(task)
      if (!amr.taskId) this.startTask(task, amr)
    },

    async saveRule(rule: DispatchRule): Promise<DispatchRule> {
      const saved = await updateDispatchRule({ ...rule, updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }) })
      const index = this.rules.findIndex((item) => item.id === saved.id)
      if (index >= 0) this.rules[index] = saved
      return saved
    },
  },
})
