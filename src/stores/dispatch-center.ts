import { defineStore } from 'pinia'
import { getTwinSnapshot } from '../api/modules/operations'
import { getTaskRecords } from '../api/modules/task-records'
import { getDispatchRules, updateDispatchRule } from '../api/modules/dispatch'
import type { Amr, DispatchRule, MapResource, Task, TaskRecord } from '../types/domain'

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
  { type: '线边补料', requestDeviceId: 'CNC-08', behaviorName: '线边补料标准流程', behaviorVersion: 'v1.8' },
  { type: '成品转运', requestDeviceId: 'CNC-12', behaviorName: 'CNC 成品转运', behaviorVersion: 'v2.4' },
  { type: '空箱回收', requestDeviceId: 'CNC-21', behaviorName: '空箱回收流程', behaviorVersion: 'v1.3' },
  { type: '半成品转运', requestDeviceId: 'CNC-33', behaviorName: '半成品转运流程', behaviorVersion: 'v2.1' },
]

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

/** 按时长从给定时间往前推算（用于生成记录的请求时间）。 */
function subtractByDuration(time: string, duration: string): string {
  const [m = 0, s = 0] = duration.split(':').map(Number)
  const date = new Date(time.replace(' ', 'T'))
  date.setSeconds(date.getSeconds() - (m * 60 + s))
  return formatDateTime(date)
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
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
  pendingSince: Record<string, number>
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
    pendingSince: {},
    timer: null,
  }),

  getters: {
    abnormalCount(state): number {
      return state.tasks.filter((task) => task.status === '异常').length
    },
    runningCount(state): number {
      return state.tasks.filter((task) => task.status === '运行中').length
    },
    pendingCount(state): number {
      return state.tasks.filter((task) => task.status === '待分配').length
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
    /** 派单记录中按任务类型统计"已应用次数"，用于任务设置表打通数据。 */
    recordCountByType(state): Record<string, number> {
      const counts: Record<string, number> = {}
      for (const record of state.records) {
        counts[record.type] = (counts[record.type] ?? 0) + 1
      }
      return counts
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
      this.pendingSince = {}
      for (const task of this.tasks) {
        if (task.status === '待分配') this.pendingSince[task.id] = 0
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

    /** 推进一个模拟 tick：派发待分配任务、推进执行进度、处理完成/异常。 */
    tick() {
      this.tickCount += 1

      // 1. 待分配任务交给派单引擎，按该任务类型的调度策略选车
      //    至少停留 1 个 tick，让"待分配"状态可被观察到
      for (const task of this.tasks) {
        const pendingSince = this.pendingSince[task.id] ?? this.tickCount
        if (task.status === '待分配' && this.tickCount - pendingSince >= 1) {
          this.dispatchTask(task.id)
        }
      }

      // 2. 执行中任务推进进度
      const completed: string[] = []
      for (const task of this.tasks) {
        if (task.status !== '运行中') continue
        task.progress = Math.min(task.progress + (4 + Math.round(Math.random() * 8)), 100)
        task.duration = addSeconds(task.duration, TICK_SECONDS)
        if (task.progress >= 100) completed.push(task.id)
      }
      for (const taskId of completed) this.completeTask(taskId)

      // 3. 低概率制造一个异常，让"异常"指标保持有内容
      if (Math.random() < 0.1) {
        const candidates = this.tasks.filter((task) => task.status === '运行中')
        if (candidates.length) {
          const target = candidates[Math.floor(Math.random() * candidates.length)]
          target.status = '异常'
          target.phase = '交通资源占用'
          target.behaviorSteps = target.behaviorSteps.map((step) =>
            step.status === 'running' ? { ...step, status: 'failure', detail: '交通资源申请超时，已重试 3 次' } : step,
          )
        }
      }

      // 4. 持续生成新任务请求，让闭环不断运转
      if (this.tasks.length < 8 && Math.random() < 0.5) this.spawnTask()

      this.lastUpdate = now()
    },

    /** 为待分配任务按规则选择 AMR 并下发。 */
    dispatchTask(taskId: string) {
      const task = this.tasks.find((item) => item.id === taskId)
      if (!task || task.status !== '待分配') return

      const rule = this.rules.find((item) => item.taskType === task.type)
      const strategy = rule?.strategy ?? '先进先出'
      const amr = this.pickAmr(task, strategy)
      if (!amr) return

      task.amrId = amr.id
      task.status = '运行中'
      task.phase = '驶向目标点'
      task.progress = 0
      task.duration = '00:00'
      task.events = [
        ...task.events,
        { id: `ev-${task.id}-dispatch`, time: now().slice(11), label: `${amr.id} 接受任务（按${STRATEGY_LABEL[strategy]}）`, type: 'task' },
      ]

      amr.taskId = task.id
      amr.status = '运行'
      amr.tone = 'running'
      amr.speed = 0.6
    },

    /** 根据调度策略从可用 AMR 中选一台。 */
    pickAmr(task: Task, strategy: DispatchRule['strategy']): Amr | null {
      const available = this.amrs.filter(
        (amr) =>
          amr.connectionStatus === 'online' &&
          amr.runnable !== false &&
          amr.dispatchStatus !== 'paused' &&
          amr.status !== '停用' &&
          amr.status !== '充电' &&
          amr.status !== '异常' &&
          amr.status !== '离线' &&
          !amr.taskId,
      )
      if (!available.length) return null

      const request = this.resources.find((resource) => resource.id === task.requestDeviceId)

      if (strategy === '最短距离' || strategy === '最短时间') {
        if (request) {
          return [...available].sort(
            (a, b) => distance(a.position, request.position) - distance(b.position, request.position),
          )[0]
        }
      }

      if (strategy === '负载均衡') {
        const load = (amrId: string) => this.tasks.filter((item) => item.amrId === amrId && item.status === '运行中').length
        return [...available].sort((a, b) => load(a.id) - load(b.id))[0]
      }

      // 先进先出 / 提前叫料：取编号最小的可用车，模拟排队分配
      return [...available].sort((a, b) => a.id.localeCompare(b.id))[0]
    },

    /** 完成任务：释放 AMR、生成派单记录、从实时列表移除。 */
    completeTask(taskId: string) {
      const index = this.tasks.findIndex((task) => task.id === taskId)
      if (index < 0) return
      const task = this.tasks[index]
      if (task.amrId) this.releaseAmr(task.amrId, taskId)

      const finishedAt = now()
      const record: TaskRecord = {
        id: task.id,
        type: task.type,
        requestDeviceId: task.requestDeviceId,
        amrId: task.amrId ?? '未分配',
        result: '已完成',
        requestedAt: subtractByDuration(finishedAt, task.duration),
        finishedAt,
        duration: task.duration,
        behaviorName: task.behaviorName,
        behaviorVersion: task.behaviorVersion,
        summary: '任务完成，设备请求已满足，资源已释放。',
        strategy: this.strategyLabel(task.type),
      }
      this.tasks.splice(index, 1)
      this.records.unshift(record)
    },

    /** 取消任务：与完成同构，生成"已取消"记录。 */
    cancelTask(taskId: string) {
      const index = this.tasks.findIndex((task) => task.id === taskId)
      if (index < 0) return
      const task = this.tasks[index]
      if (task.amrId) this.releaseAmr(task.amrId, taskId)

      const finishedAt = now()
      const record: TaskRecord = {
        id: task.id,
        type: task.type,
        requestDeviceId: task.requestDeviceId,
        amrId: task.amrId ?? '未分配',
        result: '已取消',
        requestedAt: subtractByDuration(finishedAt, task.duration),
        finishedAt,
        duration: task.duration,
        behaviorName: task.behaviorName,
        behaviorVersion: task.behaviorVersion,
        summary: '用户取消任务，系统已停止后续调度与执行。',
        strategy: this.strategyLabel(task.type),
      }
      this.tasks.splice(index, 1)
      this.records.unshift(record)
    },

    /** 重试异常任务：释放占用的 AMR，退回待分配后立即重新派发。 */
    retryTask(taskId: string) {
      const task = this.tasks.find((item) => item.id === taskId)
      if (!task || task.status !== '异常') return
      if (task.amrId) {
        this.releaseAmr(task.amrId, taskId)
        task.amrId = null
      }
      task.status = '待分配'
      task.phase = '等待重新派车'
      task.progress = Math.max(task.progress - 40, 0)
      task.behaviorSteps = task.behaviorSteps.map((step) =>
        step.status === 'failure' ? { ...step, status: 'pending' } : step,
      )
      this.pendingSince[task.id] = this.tickCount
      this.dispatchTask(task.id)
    },

    releaseAmr(amrId: string, taskId: string) {
      const amr = this.amrs.find((item) => item.id === amrId)
      if (amr && amr.taskId === taskId) {
        amr.taskId = null
        amr.status = '空闲'
        amr.tone = 'idle'
        amr.speed = 0
      }
    },

    /** 随机生成一条新的待分配任务。 */
    spawnTask() {
      const template = NEW_TASK_TEMPLATES[this.seq % NEW_TASK_TEMPLATES.length]
      this.seq += 1
      const date = new Date()
      const datePart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
      const task: Task = {
        id: `TSK-${datePart}-${String(100 + this.seq)}`,
        type: template.type,
        amrId: null,
        requestDeviceId: template.requestDeviceId,
        phase: '等待派车',
        status: '待分配',
        priority: Math.random() < 0.25 ? '高' : '普通',
        duration: '00:00',
        progress: 0,
        behaviorName: template.behaviorName,
        behaviorVersion: template.behaviorVersion,
        behaviorSteps: [
          { id: `n1-${this.seq}`, name: '接收请求', status: 'success', duration: '0.2s' },
          { id: `n2-${this.seq}`, name: '调度 AMR', status: 'pending', duration: '—' },
          { id: `n3-${this.seq}`, name: '前往目标点', status: 'pending', duration: '—' },
        ],
        events: [
          { id: `ev-${this.seq}-new`, time: now().slice(11), label: `${template.requestDeviceId} 上抛${template.type}请求`, type: 'task' },
        ],
        plannedPath: '',
        traveledPath: '',
      }
      this.tasks.unshift(task)
      this.pendingSince[task.id] = this.tickCount
    },

    async saveRule(rule: DispatchRule): Promise<DispatchRule> {
      const saved = await updateDispatchRule({ ...rule, updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }) })
      const index = this.rules.findIndex((item) => item.id === saved.id)
      if (index >= 0) this.rules[index] = saved
      return saved
    },
  },
})
