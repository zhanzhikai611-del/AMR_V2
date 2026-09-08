<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Amr, Task } from '../../types/domain'
import AppIcon from '../../components/AppIcon.vue'

const props = defineProps<{ task: Task | null; amr: Amr | null }>()
const emit = defineEmits<{ close: []; collapse: [] }>()
const activeTab = ref<'task' | 'vehicle'>('task')
const visibleSteps = computed(() => props.task?.behaviorSteps ?? [])
const currentFault = computed(() => props.amr?.faultInfo ?? (props.amr?.status === '异常'
  ? { code: 'AMR-FAULT', message: '车辆上报异常，请检查诊断日志', reportedAt: '刚刚' }
  : null))

const tabs = [
  { id: 'task', label: '任务执行' },
  { id: 'vehicle', label: 'AMR 信息' },
] as const

function formatPosition(amr: Amr | null) {
  if (!amr) return '—'
  return `(${amr.position.x.toFixed(2)}, ${amr.position.y.toFixed(2)})`
}
function vehicleCode(amr: Amr | null) {
  if (!amr) return '—'
  const match = amr.name.match(/_([A-Z])_0*(\d+)$/i)
  return match ? `${match[1]!.toUpperCase()}${match[2]}` : amr.id.replace(/^AMR-0*/i, '')
}

</script>

<template>
  <aside class="object-inspector">
    <header class="inspector-header" :class="{ 'inspector-header--vehicle': amr }">
      <div v-if="amr" class="inspector-vehicle-heading">
        <div class="vehicle-mark"><span>{{ vehicleCode(amr) }}</span><i :class="amr.tone"></i></div>
        <div><h2 :title="amr.name">{{ amr.name }}</h2><div class="inspector-vehicle-meta"><span>{{ amr.vendor ?? 'Moying' }} · {{ amr.model }}</span><span class="type-data">{{ amr.ip }}</span></div></div>
      </div>
      <div v-else><h2>{{ task?.id }}</h2></div>
      <div class="inspector-header-actions"><button type="button" aria-label="收起 AMR 详情" @click="emit('collapse')"><AppIcon class="inspector-collapse-icon" name="chevron" :size="16" /></button><button type="button" aria-label="关闭检查面板" @click="emit('close')"><AppIcon name="close" :size="16" /></button></div>
    </header>
    <nav class="inspector-tabs" aria-label="对象详情">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" :disabled="tab.id === 'vehicle' && !amr" @click="activeTab = tab.id">{{ tab.label }}</button>
    </nav>

    <div v-if="activeTab === 'task'" class="inspector-content task-execution-panel">
      <section class="task-overview-card">
        <header>
          <div><span>当前任务</span><strong class="type-data">{{ task?.id ?? '暂无任务' }}</strong></div>
          <em :class="task?.status">{{ task?.status ?? '无任务' }}</em>
        </header>
        <div class="task-overview-card__facts">
          <div><span>任务类型</span><strong>{{ task?.type ?? '—' }}</strong></div>
          <div><span>请求设备</span><strong class="type-data">{{ task?.requestDeviceId ?? '—' }}</strong></div>
        </div>
        <footer>
          <div><span>任务进度</span><strong class="type-data">{{ task?.progress ?? 0 }}<small>%</small></strong></div>
          <i><b :style="{ width: `${task?.progress ?? 0}%` }"></b></i>
        </footer>
      </section>
      <div class="behavior-sequence-title"><strong>执行过程</strong><span>{{ visibleSteps.length }} 个节点</span></div>
      <ol class="behavior-trail">
        <li v-for="step in visibleSteps" :key="step.id" :class="step.status">
          <i><span></span></i>
          <div><strong>{{ step.name }}</strong><small>{{ step.status === 'running' ? '运行中' : step.status === 'success' ? '已完成' : step.status === 'failure' ? '失败' : '未开始' }}</small><p v-if="step.status === 'failure' && step.detail">{{ step.detail }}</p></div>
          <time v-if="step.status === 'success'" class="type-data">{{ step.duration }}</time>
        </li>
      </ol>
    </div>

    <div v-else class="inspector-content vehicle-panel">
      <section class="vehicle-status-card" :class="amr?.tone">
        <header><span>当前状态</span><em>{{ amr?.status ?? '—' }}</em></header>
        <div v-if="currentFault" class="vehicle-fault-detail">
          <i aria-hidden="true">!</i>
          <div><strong>{{ currentFault.message }}</strong><span><b class="type-data">{{ currentFault.code }}</b><time class="type-data">{{ currentFault.reportedAt }} 上报</time></span></div>
        </div>
      </section>
      <div class="vehicle-battery-hero" :class="{ low: (amr?.battery ?? 100) <= 30, critical: (amr?.battery ?? 100) <= 15 }"><span>当前电量</span><strong class="type-data">{{ amr?.battery ?? '—' }}<small>%</small></strong><i><b :style="{ width: `${amr?.battery ?? 0}%` }"></b></i></div>
      <dl class="vehicle-properties">
        <div><dt>当前位置</dt><dd class="type-data">{{ formatPosition(amr) }}</dd></div>
        <div><dt>当前速度</dt><dd class="type-data">{{ amr?.speed ?? '—' }} m/s</dd></div>
      </dl>
      <section class="service-scope">
        <header><div><strong>服务范围</strong></div><em>{{ (amr?.maxServiceDevices ?? amr?.serviceDevices ?? []).length }} 项</em></header>
        <div class="scope-group"><span>服务站点</span><div><i v-for="device in (amr?.maxServiceDevices ?? amr?.serviceDevices ?? [])" :key="device" :class="{ unavailable: !amr?.serviceDevices.includes(device) }" :title="!amr?.serviceDevices.includes(device) ? '人工上料，不在 AMR 服务范围' : undefined">{{ device }}</i></div></div>
      </section>
    </div>
  </aside>
</template>
