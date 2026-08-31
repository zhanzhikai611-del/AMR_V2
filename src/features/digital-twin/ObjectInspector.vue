<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Amr, Task } from '../../types/domain'
import AppIcon from '../../components/AppIcon.vue'

const props = defineProps<{ task: Task | null; amr: Amr | null }>()
const emit = defineEmits<{ close: []; collapse: [] }>()
const activeTab = ref<'task' | 'vehicle'>('task')
const visibleSteps = computed(() => props.task?.behaviorSteps ?? [])

const tabs = [
  { id: 'task', label: '任务执行' },
  { id: 'vehicle', label: 'AMR 信息' },
] as const

function formatPosition(amr: Amr | null) {
  if (!amr) return '—'
  return `(${amr.position.x.toFixed(2)}, ${amr.position.y.toFixed(2)})`
}

</script>

<template>
  <aside class="object-inspector">
    <header class="inspector-header">
      <div><h2>{{ amr?.id ?? task?.id }}</h2></div>
      <div class="inspector-header-actions"><button type="button" aria-label="收起 AMR 详情" @click="emit('collapse')">›</button><button type="button" aria-label="关闭检查面板" @click="emit('close')"><AppIcon name="close" /></button></div>
    </header>
    <nav class="inspector-tabs" aria-label="对象详情">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" :disabled="tab.id === 'vehicle' && !amr" @click="activeTab = tab.id">{{ tab.label }}</button>
    </nav>

    <div v-if="activeTab === 'task'" class="inspector-content task-execution-panel">
      <section class="task-overview-card">
        <header>
          <div><span>当前任务</span><strong class="type-data">{{ task?.id ?? '暂无任务' }}</strong></div>
          <em :class="task?.status">{{ task?.status ?? amr?.status }}</em>
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
      <section class="vehicle-identity">
        <div class="vehicle-mark"><span>{{ amr?.id.slice(-2) }}</span><i :class="amr?.tone"></i></div>
        <div><p>{{ amr?.name }}</p><strong class="type-data">{{ amr?.model }} · {{ amr?.chassis }}</strong><span class="vehicle-rated-load">额定载荷 <b class="type-data">{{ amr?.ratedLoad ?? '—' }}</b></span></div>
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
