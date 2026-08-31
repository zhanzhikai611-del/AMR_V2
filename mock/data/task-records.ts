import type { BehaviorStep, TaskRecord } from '../../src/types/domain'
import { snapshotExecution } from '../../src/features/tasks/execution-history'

const seedRecords: TaskRecord[] = [
  { id: 'TSK-260822-017', type: '成品转运', requestDeviceId: 'D02', amrId: 'AMR-01', result: '已完成', requestedAt: '2026-08-22 09:18:22', finishedAt: '2026-08-22 09:27:14', duration: '08:52', behaviorName: '成品转运流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
  { id: 'TSK-260822-016', type: '设备补料', requestDeviceId: 'D06', amrId: 'AMR-02', result: '已完成', requestedAt: '2026-08-22 08:56:07', finishedAt: '2026-08-22 09:03:39', duration: '07:32', behaviorName: '设备补料流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
  { id: 'TSK-260821-048', type: '设备下料', requestDeviceId: 'D14', amrId: 'AMR-05', result: '已取消', requestedAt: '2026-08-21 17:42:18', finishedAt: '2026-08-21 17:53:26', duration: '11:08', behaviorName: '设备下料流程', behaviorVersion: 'v1.0', summary: '异常处理后取消任务' },
  { id: 'TSK-260821-047', type: '半成品转运', requestDeviceId: 'D12', amrId: 'AMR-06', result: '已完成', requestedAt: '2026-08-21 16:21:44', finishedAt: '2026-08-21 16:29:51', duration: '08:07', behaviorName: '半成品转运流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
  { id: 'TSK-260821-046', type: '成品转运', requestDeviceId: 'D04', amrId: 'AMR-03', result: '已取消', requestedAt: '2026-08-21 15:04:12', finishedAt: '2026-08-21 15:05:03', duration: '00:51', behaviorName: '成品转运流程', behaviorVersion: 'v1.0', summary: '异常处理后取消任务' },
  { id: 'TSK-260820-039', type: '成品转运', requestDeviceId: 'D12', amrId: 'AMR-04', result: '已完成', requestedAt: '2026-08-20 14:28:16', finishedAt: '2026-08-20 14:37:02', duration: '08:46', behaviorName: '成品转运流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
  { id: 'TSK-260820-038', type: '设备补料', requestDeviceId: 'D02', amrId: 'AMR-02', result: '已完成', requestedAt: '2026-08-20 13:11:20', finishedAt: '2026-08-20 13:19:44', duration: '08:24', behaviorName: '设备补料流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
  { id: 'TSK-260819-031', type: '半成品转运', requestDeviceId: 'D06', amrId: 'AMR-06', result: '已完成', requestedAt: '2026-08-19 11:42:08', finishedAt: '2026-08-19 11:50:31', duration: '08:23', behaviorName: '半成品转运流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
  { id: 'TSK-260818-027', type: '设备下料', requestDeviceId: 'D04', amrId: 'AMR-01', result: '已完成', requestedAt: '2026-08-18 16:06:39', finishedAt: '2026-08-18 16:15:47', duration: '09:08', behaviorName: '设备下料流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
  { id: 'TSK-260817-019', type: '成品转运', requestDeviceId: 'D14', amrId: 'AMR-03', result: '已取消', requestedAt: '2026-08-17 10:14:25', finishedAt: '2026-08-17 10:17:02', duration: '02:37', behaviorName: '成品转运流程', behaviorVersion: 'v1.0', summary: '异常处理后取消任务' },
  { id: 'TSK-260815-012', type: '设备补料', requestDeviceId: 'D12', amrId: 'AMR-04', result: '已完成', requestedAt: '2026-08-15 09:05:14', finishedAt: '2026-08-15 09:13:28', duration: '08:14', behaviorName: '设备补料流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
  { id: 'TSK-260808-003', type: '成品转运', requestDeviceId: 'D02', amrId: 'AMR-01', result: '已完成', requestedAt: '2026-08-08 08:30:10', finishedAt: '2026-08-08 08:38:22', duration: '08:12', behaviorName: '成品转运流程', behaviorVersion: 'v1.0', summary: '上下料流程完成' },
]

/** 明确的历史演示轨迹；仅在 Mock 层生成，真实接口缺失轨迹时不补造。 */
export const taskRecords: TaskRecord[] = seedRecords.map((record, recordIndex) => {
  const routes: Record<string, string[]> = {
    设备补料: ['前往备料点', '执行上料', '前往目标设备', '执行下料'],
    设备下料: ['前往目标设备', '执行上料', '前往下料点', '执行下料'],
    成品转运: ['前往产出设备', '执行上料', '前往成品下料点', '执行下料'],
    半成品转运: ['前往上游设备', '执行上料', '前往下游设备', '执行下料'],
  }
  const names = routes[record.type] ?? []
  const canceledIndex = record.result === '已取消' ? recordIndex % names.length : -1
  const executedCount = canceledIndex < 0 ? names.length : canceledIndex + 1
  const [minutes, seconds] = record.duration.split(':').map(Number)
  const total = minutes * 60 + seconds
  const steps: BehaviorStep[] = names.map((name, index) => ({
    id: `${record.id}-n${index + 1}`,
    name,
    status: index === canceledIndex ? 'failure' : canceledIndex < 0 || index < canceledIndex ? 'success' : 'pending',
    duration: index < executedCount ? `${Math.floor(total / executedCount) + (index === executedCount - 1 ? total % executedCount : 0)}s` : '—',
    detail: index === canceledIndex ? (name.startsWith('前往') ? '限行区通行权申请超时，异常处理后由系统取消（模拟）' : '上下料动作反馈超时，异常处理后由系统取消（模拟）') : undefined,
  }))
  return { ...record, ...snapshotExecution(steps, record.result) }
})
