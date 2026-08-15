import { http } from '../http'
import type { TaskRecord } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getTaskRecords(): Promise<TaskRecord[]> {
  if (useMock) {
    const { taskRecords } = await import('../../../mock/data/task-records')
    return structuredClone(taskRecords)
  }
  return (await http.get<{ data: TaskRecord[] }>('/task-records')).data.data
}
