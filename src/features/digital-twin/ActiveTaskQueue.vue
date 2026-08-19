<script setup lang="ts">
import type { Task } from '../../types/domain'

defineProps<{
  tasks: Task[]
  selectedTaskId: string | null
  filter: 'all' | 'running' | 'waiting' | 'abnormal'
}>()

const emit = defineEmits<{
  select: [id: string]
  filter: [value: 'all' | 'running' | 'waiting' | 'abnormal']
  collapse: []
}>()

const filters = [
  { id: 'all', label: '全部' },
  { id: 'running', label: '执行中' },
  { id: 'waiting', label: '等待' },
  { id: 'abnormal', label: '异常' },
] as const

</script>

<template>
  <aside class="task-queue">
    <header class="task-queue__header">
      <div><p class="section-kicker">DISPATCH TASKS</p><h2>派单任务 <small>{{ tasks.length }}</small></h2></div>
      <button class="pane-collapse-button" type="button" aria-label="收起派单任务" @click="emit('collapse')">‹</button>
    </header>
    <div class="task-filters" aria-label="任务筛选">
      <button
        v-for="item in filters"
        :key="item.id"
        type="button"
        :class="{ active: filter === item.id }"
        @click="emit('filter', item.id)"
      >{{ item.label }}</button>
    </div>
    <div class="task-list">
      <button
        v-for="task in tasks"
        :key="task.id"
        class="task-card"
        :class="[`is-${task.status}`, { selected: selectedTaskId === task.id }]"
        type="button"
        @click="emit('select', task.id)"
      >
        <span class="task-card__rail"></span>
        <span class="task-card__top">
          <b class="type-data">{{ task.id }}</b>
          <em>{{ task.status }}</em>
        </span>
        <span class="task-card__title">{{ task.type }}<small>{{ task.amrId ?? '待分配 AMR' }}</small></span>
        <span class="task-card__route"><small>请求设备</small><b>{{ task.requestDeviceId }}</b></span>
        <span class="task-card__meta"><span>{{ task.phase }}</span><time class="type-data">{{ task.duration }}</time></span>
        <span class="task-progress"><i :style="{ width: `${task.progress}%` }"></i></span>
      </button>
      <div v-if="tasks.length === 0" class="task-empty">
        <strong>当前筛选下没有任务</strong><span>选择其他状态查看派单任务。</span>
      </div>
    </div>
  </aside>
</template>
