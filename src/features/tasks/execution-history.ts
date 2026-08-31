import type { BehaviorStep, TaskRecord } from '../../types/domain'

/** 原型推进器：以任意数量的节点模拟执行；正式数据由执行引擎上报。 */
export function advanceSimulatedSteps(steps: BehaviorStep[], progress: number, seconds: number): BehaviorStep[] {
  const completed = Math.floor(Math.max(0, Math.min(100, progress)) / 100 * steps.length)
  return steps.map((step, index) => {
    if (step.status === 'skipped' || step.status === 'failure') return { ...step }
    const status = index < completed ? 'success' : index === completed ? 'running' : 'pending'
    const prior = step.duration.match(/^(\d+)s$/)
    const duration = step.status === 'running'
      ? `${(prior ? Number(prior[1]) : 0) + seconds}s`
      : step.duration
    return { ...step, status, duration }
  })
}

/** 只复制实例轨迹，不读取可变的行为树模板，也不猜测缺失的取消节点。 */
export function snapshotExecution(steps: BehaviorStep[], result: TaskRecord['result']): Pick<TaskRecord, 'behaviorSteps' | 'canceledStepId' | 'cancelReason'> {
  const interrupted = result === '已取消'
    ? steps.find(step => step.status === 'failure') ?? steps.find(step => step.status === 'running')
    : undefined
  return {
    behaviorSteps: steps.map(step => ({ ...step })),
    canceledStepId: interrupted?.id,
    cancelReason: result === '已取消' ? interrupted?.detail ?? '任务由系统结束，未提供具体取消原因' : undefined,
  }
}
