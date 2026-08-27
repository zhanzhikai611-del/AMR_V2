import type {
  AlarmTypeSummary,
  AmrAnalytics,
  AnalyticsAlarmRecord,
  AnalyticsQuery,
  AnalyticsState,
  AnalyticsTaskRecord,
  AnalyticsTrendPoint,
  GlobalAnalytics,
  StateDuration,
  VehicleUtilization,
} from '../../src/types/analytics'

const amrs = [
  { id: 'AMR-01', name: '一号线搬运车 01', model: 'LP-200', rate: 61.8 },
  { id: 'AMR-02', name: '一号线搬运车 02', model: 'LP-200', rate: 82.6 },
  { id: 'AMR-03', name: '一号线搬运车 03', model: 'OMNI-300', rate: 72.4 },
  { id: 'AMR-04', name: '二号线搬运车 01', model: 'LP-200', rate: 58.7 },
  { id: 'AMR-05', name: '缓冲区转运车 01', model: 'SW-500', rate: 47.2 },
  { id: 'AMR-06', name: '备用搬运车 01', model: 'LP-200', rate: 76.9 },
]

const stateOrder: AnalyticsState[] = ['running', 'idle', 'charging', 'abnormal', 'disabled', 'offline']
const globalStateRatios = [62, 26, 9, 3, 0, 0]

function dateLabel(offset: number) {
  const date = new Date(2026, 7, 22)
  date.setDate(date.getDate() - offset)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

const dailyTrend: AnalyticsTrendPoint[] = Array.from({ length: 30 }, (_, index) => {
  const chronologicalIndex = 29 - index
  const wave = ((chronologicalIndex * 7) % 13) - 6
  const taskCount = 38 + ((chronologicalIndex * 5) % 17)
  return {
    label: dateLabel(chronologicalIndex),
    utilizationRate: Number((66.2 + wave * 1.15).toFixed(1)),
    taskCount,
    completedCount: Math.max(0, taskCount - (chronologicalIndex % 5 === 0 ? 3 : 1)),
  }
})

function rangeDays(range: AnalyticsQuery['range']) {
  return range === 'today' ? 1 : range === '7d' ? 7 : 30
}

function trendFor(range: AnalyticsQuery['range']) {
  return dailyTrend.slice(-rangeDays(range))
}

function stateDurations(days: number, ratios = globalStateRatios, vehicleCount = 6): StateDuration[] {
  const total = days * vehicleCount * 16 * 60
  return stateOrder.map((state, index) => ({ state, ratio: ratios[index], minutes: Math.round(total * ratios[index] / 100) }))
}

function summaryFrom(trend: AnalyticsTrendPoint[], alarmCount: number, abnormalDurationMinutes: number) {
  const taskCount = trend.reduce((sum, point) => sum + point.taskCount, 0)
  const completedCount = trend.reduce((sum, point) => sum + point.completedCount, 0)
  return {
    utilizationRate: Number((trend.reduce((sum, point) => sum + point.utilizationRate, 0) / trend.length).toFixed(1)),
    taskCount,
    completedCount,
    completionRate: Number((completedCount / taskCount * 100).toFixed(1)),
    alarmCount,
    abnormalDurationMinutes,
  }
}

function vehicleRows(days: number): VehicleUtilization[] {
  return amrs.map((amr, index) => {
    const total = days * 16 * 60
    const runningMinutes = Math.round(total * amr.rate / 100)
    const abnormalMinutes = index === 4 ? days * 28 : days * (index % 3) * 4
    const chargingMinutes = Math.round(total * (0.08 + index * 0.008))
    return {
      amrId: amr.id,
      name: amr.name,
      utilizationRate: amr.rate,
      taskCount: Math.round(days * (5.4 + index * 0.45)),
      runningMinutes,
      idleMinutes: Math.max(0, total - runningMinutes - chargingMinutes - abnormalMinutes),
      chargingMinutes,
      abnormalMinutes,
      disabledMinutes: 0,
      offlineMinutes: 0,
    }
  }).sort((a, b) => b.utilizationRate - a.utilizationRate)
}

function alarmTypes(days: number): AlarmTypeSummary[] {
  const factor = days === 1 ? 1 : days === 7 ? 3 : 8
  return [
    { type: '资源锁释放超时', count: 3 * factor, affectedMinutes: 26 * factor },
    { type: '设备通讯中断', count: 2 * factor, affectedMinutes: 18 * factor },
    { type: '定位置信度低', count: 2 * factor, affectedMinutes: 9 * factor },
    { type: '路径阻塞', count: factor, affectedMinutes: 15 * factor },
  ]
}

export function createGlobalAnalytics(query: AnalyticsQuery): GlobalAnalytics {
  const days = rangeDays(query.range)
  const trend = trendFor(query.range)
  const alarms = alarmTypes(days)
  return {
    summary: summaryFrom(trend, alarms.reduce((sum, item) => sum + item.count, 0), alarms.reduce((sum, item) => sum + item.affectedMinutes, 0)),
    trend,
    stateDurations: stateDurations(days),
    vehicles: vehicleRows(days),
    alarmTypes: alarms,
    updatedAt: '2026-08-22 15:42:18',
  }
}

const taskTypes = ['半成品转运', '成品转运', '线边补料', '空箱回收']
const alarmNames = ['资源锁释放超时', '定位置信度低', '设备通讯中断', '路径阻塞']

function historyDate(offset: number) {
  const date = new Date(2026, 7, 22)
  date.setDate(date.getDate() - offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const taskHistory: AnalyticsTaskRecord[] = Array.from({ length: 300 }, (_, index) => {
  const date = historyDate(Math.floor(index / 10))
  const compactDate = `${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}`
  const hour = 15 - (index % 3) * 2
  const durationMinutes = 7 + (index * 7) % 22
  const startedMinute = (index * 11) % 50
  const endedMinute = (startedMinute + durationMinutes) % 60
  return {
    id: `TSK-${compactDate}-${String(300 - index).padStart(3, '0')}`,
    type: taskTypes[index % taskTypes.length],
    requestDeviceId: `CNC-${String(25 + (index * 5) % 12).padStart(2, '0')}`,
    startedAt: `${date} ${String(hour).padStart(2, '0')}:${String(startedMinute).padStart(2, '0')}:12`,
    endedAt: `${date} ${String(hour + Math.floor((startedMinute + durationMinutes) / 60)).padStart(2, '0')}:${String(endedMinute).padStart(2, '0')}:03`,
    duration: `${String(durationMinutes).padStart(2, '0')}:${String((index * 13) % 60).padStart(2, '0')}`,
    result: index % 9 === 0 ? '已取消' : '已完成',
  }
})

const alarmHistory: AnalyticsAlarmRecord[] = Array.from({ length: 60 }, (_, index) => {
  const date = historyDate(Math.floor(index / 2))
  const compactDate = `${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}`
  const minutes = 4 + (index * 3) % 18
  return {
    id: `ALM-${compactDate}-${String(60 - index).padStart(3, '0')}`,
    type: alarmNames[index % alarmNames.length],
    occurredAt: `${date} ${String(15 - index % 6).padStart(2, '0')}:12:08`,
    recoveredAt: `${date} ${String(15 - index % 6).padStart(2, '0')}:${String(12 + minutes).padStart(2, '0')}:03`,
    duration: `${String(minutes).padStart(2, '0')}:55`,
    taskId: index % 4 === 2 ? undefined : taskHistory[Math.min(index * 2, taskHistory.length - 1)].id,
    result: index % 3 === 0 ? '已处理' : '已恢复',
  }
})

export function createAmrAnalytics(amrId: string, query: AnalyticsQuery): AmrAnalytics {
  const days = rangeDays(query.range)
  const profile = amrs.find((amr) => amr.id === amrId) ?? amrs[0]
  const adjustment = amrs.findIndex((amr) => amr.id === profile.id) * 1.7
  const trend = trendFor(query.range).map((point, index) => ({
    ...point,
    utilizationRate: Number(Math.max(30, Math.min(94, profile.rate + ((index * 5) % 9) - 4)).toFixed(1)),
    taskCount: Math.max(1, Math.round(point.taskCount / 6 + adjustment / 4)),
    completedCount: Math.max(1, Math.round(point.completedCount / 6 + adjustment / 5)),
  }))
  const ratios = [Math.round(profile.rate), 100 - Math.round(profile.rate) - 17, 9, 2, 6, 0]
  const historyDays = rangeDays(query.range)
  const alarms = alarmHistory.filter((_, index) => Math.floor(index / 2) < historyDays)
  const summary = summaryFrom(trend, alarms.length, alarms.length * 18)
  const canceledCount = summary.taskCount - summary.completedCount
  const tasks: AnalyticsTaskRecord[] = taskHistory
    .filter((_, index) => Math.floor(index / 10) < historyDays)
    .slice(0, summary.taskCount)
    .map((task, index) => ({ ...task, result: index < canceledCount ? '已取消' : '已完成' }))
  return {
    amrId: profile.id,
    name: profile.name,
    model: profile.model,
    summary,
    trend,
    stateDurations: stateDurations(days, ratios, 1),
    tasks,
    alarms,
    updatedAt: '2026-08-22 15:42:18',
  }
}
