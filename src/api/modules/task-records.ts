import { http } from '../http'
import type { Task, TaskRecord } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getTaskRecords(): Promise<TaskRecord[]> {
  if (useMock) {
    const { taskRecords } = await import('../../../mock/data/task-records')
    return structuredClone(taskRecords)
  }
  return (await http.get<{ data: TaskRecord[] }>('/task-records')).data.data
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function createCanceledRecord(task: Task): TaskRecord {
  const finished = new Date()
  const [minutes, seconds] = task.duration.split(':').map(Number)
  const requested = new Date(finished.getTime() - ((minutes || 0) * 60 + (seconds || 0)) * 1000)
  return {
    id: task.id,
    type: task.type,
    requestDeviceId: task.requestDeviceId,
    amrId: task.amrId ?? '未分配',
    result: '已取消',
    requestedAt: formatDateTime(requested),
    finishedAt: formatDateTime(finished),
    duration: task.duration,
    behaviorName: task.behaviorName,
    behaviorVersion: task.behaviorVersion,
    summary: '用户取消任务，系统已停止后续调度与执行。',
  }
}

export async function cancelTask(taskId: string): Promise<TaskRecord> {
  if (useMock) {
    const [{ twinSnapshot }, { taskRecords }] = await Promise.all([
      import('../../../mock/data/operations'),
      import('../../../mock/data/task-records'),
    ])
    const taskIndex = twinSnapshot.tasks.findIndex((task) => task.id === taskId)
    if (taskIndex < 0) throw new Error('任务不存在或已结束')

    const [task] = twinSnapshot.tasks.splice(taskIndex, 1)
    const record = createCanceledRecord(task)
    taskRecords.unshift(record)

    if (task.amrId) {
      const amr = twinSnapshot.amrs.find((item) => item.id === task.amrId)
      if (amr?.taskId === task.id) {
        amr.taskId = null
        amr.status = '空闲'
        amr.tone = 'idle'
        amr.speed = 0
      }
    }

    return structuredClone(record)
  }

  return (await http.post<{ data: TaskRecord }>(`/tasks/${taskId}/cancel`)).data.data
}
