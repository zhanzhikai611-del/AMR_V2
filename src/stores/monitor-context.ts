import { defineStore } from 'pinia'
import { getTwinSnapshot } from '../api/modules/operations'
import type { Amr, Task, TwinSnapshot } from '../types/domain'

export const useMonitorContextStore = defineStore('monitor-context', {
  state: () => ({
    snapshot: null as TwinSnapshot | null,
    loading: false,
    error: null as string | null,
    selectedTaskId: null as string | null,
    selectedAmrId: null as string | null,
    selectedEventId: null as string | null,
    taskFilter: 'all' as 'all' | 'running' | 'abnormal',
  }),
  getters: {
    selectedTask(state): Task | null {
      return state.snapshot?.tasks.find((task) => task.id === state.selectedTaskId) ?? null
    },
    selectedAmr(state): Amr | null {
      return state.snapshot?.amrs.find((amr) => amr.id === state.selectedAmrId) ?? null
    },
    filteredTasks(state): Task[] {
      const tasks = state.snapshot?.tasks ?? []
      if (state.taskFilter === 'running') return tasks.filter((task) => task.status === '运行中')
      if (state.taskFilter === 'abnormal') return tasks.filter((task) => task.status === '异常')
      return tasks
    },
  },
  actions: {
    async loadSnapshot() {
      this.loading = true
      this.error = null
      try {
        this.snapshot = await getTwinSnapshot()
      } catch {
        this.error = '运行数据加载失败，请检查服务连接后重试。'
      } finally {
        this.loading = false
      }
    },
    selectTask(taskId: string | null) {
      this.selectedTaskId = taskId
      this.selectedEventId = null
      this.selectedAmrId = taskId
        ? this.snapshot?.tasks.find((task) => task.id === taskId)?.amrId ?? null
        : null
    },
    selectAmr(amrId: string | null) {
      this.selectedAmrId = amrId
      this.selectedEventId = null
      this.selectedTaskId = amrId
        ? this.snapshot?.amrs.find((amr) => amr.id === amrId)?.taskId ?? null
        : null
    },
    clearSelection() {
      this.selectedTaskId = null
      this.selectedAmrId = null
      this.selectedEventId = null
    },
  },
})
