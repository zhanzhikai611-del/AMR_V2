export type AnalyticsRange = 'today' | '7d' | '30d'
export type AnalyticsState = 'running' | 'idle' | 'waiting' | 'charging' | 'abnormal'

export interface AnalyticsQuery {
  scopeId: string
  range: AnalyticsRange
}

export interface AnalyticsSummary {
  utilizationRate: number
  taskCount: number
  completedCount: number
  completionRate: number
  alarmCount: number
  abnormalDurationMinutes: number
}

export interface AnalyticsTrendPoint {
  label: string
  utilizationRate: number
  taskCount: number
  completedCount: number
}

export interface StateDuration {
  state: AnalyticsState
  minutes: number
  ratio: number
}

export interface VehicleUtilization {
  amrId: string
  name: string
  utilizationRate: number
  taskCount: number
  runningMinutes: number
  idleMinutes: number
  waitingMinutes: number
  chargingMinutes: number
  abnormalMinutes: number
}

export interface AlarmTypeSummary {
  type: string
  count: number
  affectedMinutes: number
}

export interface GlobalAnalytics {
  summary: AnalyticsSummary
  trend: AnalyticsTrendPoint[]
  stateDurations: StateDuration[]
  vehicles: VehicleUtilization[]
  alarmTypes: AlarmTypeSummary[]
  updatedAt: string
}

export interface AnalyticsTaskRecord {
  id: string
  type: string
  requestDeviceId: string
  startedAt: string
  endedAt: string
  duration: string
  result: '已完成' | '已取消'
}

export interface AnalyticsAlarmRecord {
  id: string
  type: string
  occurredAt: string
  recoveredAt: string
  duration: string
  taskId?: string
  result: '已恢复' | '已处理'
}

export interface AmrAnalytics {
  amrId: string
  name: string
  model: string
  summary: AnalyticsSummary
  trend: AnalyticsTrendPoint[]
  stateDurations: StateDuration[]
  tasks: AnalyticsTaskRecord[]
  alarms: AnalyticsAlarmRecord[]
  updatedAt: string
}
