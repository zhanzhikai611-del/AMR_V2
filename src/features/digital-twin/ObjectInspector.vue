<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Amr, Task } from '../../types/domain'
import AppIcon from '../../components/AppIcon.vue'

const props = defineProps<{ task: Task | null; amr: Amr | null }>()
const emit = defineEmits<{
  close: []
  collapse: []
  updateServiceScope: [payload: { amrId: string; serviceDevices: string[] }]
  toggleDispatch: [amrId: string]
}>()
const activeTab = ref<'overview' | 'behavior' | 'vehicle'>('behavior')
const serviceDraft = ref<string[]>([])
const dispatchConfirmOpen = ref(false)
const serviceDirty = computed(() => serviceDraft.value.join('|') !== (props.amr?.serviceDevices ?? []).join('|'))

watch(() => [props.amr?.id, ...(props.amr?.serviceDevices ?? [])], () => {
  serviceDraft.value = [...(props.amr?.serviceDevices ?? [])]
}, { immediate: true })

const tabs = [
  { id: 'overview', label: '执行概况' },
  { id: 'behavior', label: '行为监控' },
  { id: 'vehicle', label: '车辆信息' },
] as const

function formatPosition(amr: Amr | null) {
  if (!amr) return '—'
  return `(${amr.position.x.toFixed(2)}, ${amr.position.y.toFixed(2)})`
}

function toggleServiceDevice(deviceId: string) {
  serviceDraft.value = serviceDraft.value.includes(deviceId)
    ? serviceDraft.value.filter((id) => id !== deviceId)
    : [...serviceDraft.value, deviceId]
}

function saveServiceScope() {
  if (!props.amr) return
  emit('updateServiceScope', { amrId: props.amr.id, serviceDevices: serviceDraft.value })
}

function confirmDispatchChange() {
  if (!props.amr) return
  emit('toggleDispatch', props.amr.id)
  dispatchConfirmOpen.value = false
}
</script>

<template>
  <aside class="object-inspector">
    <header class="inspector-header">
      <div><h2>{{ amr?.id ?? task?.id }}</h2></div>
      <div class="inspector-header-actions"><button type="button" aria-label="收起 AMR 详情" @click="emit('collapse')">›</button><button type="button" aria-label="关闭检查面板" @click="emit('close')"><AppIcon name="close" /></button></div>
    </header>
    <div class="inspector-summary">
      <div><span>当前任务</span><strong class="type-data">{{ task?.id ?? '暂无任务' }}</strong></div>
      <em :class="amr?.dispatchStatus === 'paused' ? '等待中' : task?.status">{{ amr?.dispatchStatus === 'paused' ? '暂停接单' : task?.status ?? amr?.status }}</em>
    </div>
    <nav class="inspector-tabs" aria-label="对象详情">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" :disabled="tab.id === 'vehicle' && !amr" @click="activeTab = tab.id">{{ tab.label }}</button>
    </nav>

    <div v-if="activeTab === 'overview'" class="inspector-content overview-panel">
      <div class="overview-hero"><span>任务进度</span><strong class="type-data">{{ task?.progress ?? 0 }}<small>%</small></strong><i><b :style="{ width: `${task?.progress ?? 0}%` }"></b></i></div>
      <dl>
        <div><dt>任务类型</dt><dd>{{ task?.type ?? '—' }}</dd></div>
        <div><dt>请求设备</dt><dd>{{ task?.requestDeviceId ?? '—' }}</dd></div>
        <div><dt>当前阶段</dt><dd>{{ task?.phase ?? '—' }}</dd></div>
        <div><dt>当前位置</dt><dd class="type-data">{{ formatPosition(amr) }}</dd></div>
        <div><dt>电量</dt><dd class="type-data">{{ amr?.battery ?? '—' }}%</dd></div>
        <div><dt>当前速度</dt><dd class="type-data">{{ amr?.speed ?? '—' }} m/s</dd></div>
      </dl>
    </div>

    <div v-else-if="activeTab === 'behavior'" class="inspector-content behavior-panel">
      <div class="behavior-monitor-head"><div><span>当前行为实例</span><strong>{{ task?.behaviorName ?? '无运行实例' }}</strong></div><em>{{ task?.status ?? '未运行' }}</em></div>
      <div class="behavior-monitor-meta"><span><small>版本</small><strong>{{ task?.behaviorVersion ?? '—' }}</strong></span><span><small>任务进度</small><strong>{{ task?.progress ?? 0 }}%</strong></span><span><small>当前节点</small><strong>{{ task?.phase ?? '—' }}</strong></span></div>
      <ol class="behavior-trail">
        <li v-for="step in task?.behaviorSteps ?? []" :key="step.id" :class="step.status">
          <i><span></span></i>
          <div><strong>{{ step.name }}</strong><small>{{ step.status === 'running' ? '运行中' : step.status === 'success' ? '已完成' : step.status === 'waiting' ? '等待中' : step.status === 'failure' ? '失败' : '未开始' }}</small><p v-if="step.detail">{{ step.detail }}</p></div>
          <time class="type-data">{{ step.duration }}</time>
        </li>
      </ol>
    </div>

    <div v-else class="inspector-content vehicle-panel">
      <section class="vehicle-identity">
        <div class="vehicle-mark"><span>{{ amr?.id.slice(-2) }}</span><i :class="amr?.tone"></i></div>
        <div><p>{{ amr?.name }}</p><strong class="type-data">{{ amr?.model }} · {{ amr?.chassis }}</strong><small>最近连接 {{ amr?.connectedAt }}</small></div>
      </section>
      <dl class="vehicle-properties">
        <div><dt>IP 地址</dt><dd class="type-data">{{ amr?.ip ?? '—' }}</dd></div>
        <div><dt>初始点位</dt><dd class="type-data">{{ amr?.initialPoint ?? '—' }}</dd></div>
        <div><dt>额定载荷</dt><dd class="type-data">{{ amr?.ratedLoad ?? '—' }}</dd></div>
        <div><dt>当前电量</dt><dd class="type-data">{{ amr?.battery ?? '—' }}%</dd></div>
      </dl>
      <section class="service-scope">
        <header><div><strong>服务范围</strong></div><em>{{ (amr?.serviceDevices.length ?? 0) + (amr?.serviceStations.length ?? 0) }} 项</em></header>
        <div class="scope-group editable-scope"><span>服务 CNC</span><div><button v-for="device in amr?.maxServiceDevices ?? amr?.serviceDevices ?? []" :key="device" type="button" :class="{ active: serviceDraft.includes(device) }" @click="toggleServiceDevice(device)">{{ device }}</button></div></div>
        <div class="scope-group"><span>中转 / 回收站</span><div><i v-for="station in amr?.serviceStations ?? []" :key="station">{{ station }}</i></div></div>
        <footer v-if="serviceDirty" class="scope-actions"><button type="button" @click="serviceDraft = [...(amr?.serviceDevices ?? [])]">取消</button><button class="primary" type="button" @click="saveServiceScope">保存范围</button></footer>
      </section>
      <button class="dispatch-toggle-action" :class="{ resume: amr?.dispatchStatus === 'paused' }" type="button" @click="dispatchConfirmOpen = true">{{ amr?.dispatchStatus === 'paused' ? '恢复接单' : '暂停接单' }}</button>
    </div>
    <Teleport to="body">
      <div v-if="dispatchConfirmOpen" class="modal-backdrop" @click.self="dispatchConfirmOpen = false">
        <section class="dispatch-confirm-dialog" role="dialog" aria-modal="true" :aria-label="amr?.dispatchStatus === 'paused' ? '确认恢复接单' : '确认暂停接单'">
          <header><strong>{{ amr?.dispatchStatus === 'paused' ? '恢复接单' : '暂停接单' }}</strong><button type="button" aria-label="关闭" @click="dispatchConfirmOpen = false">×</button></header>
          <div><p>{{ amr?.dispatchStatus === 'paused' ? `${amr?.id} 将重新参与任务调度。` : `${amr?.id} 将停止接收新任务，当前连接和位置上报不受影响。` }}</p></div>
          <footer><button type="button" @click="dispatchConfirmOpen = false">取消</button><button class="primary" type="button" @click="confirmDispatchChange">确认{{ amr?.dispatchStatus === 'paused' ? '恢复' : '暂停' }}</button></footer>
        </section>
      </div>
    </Teleport>
  </aside>
</template>
