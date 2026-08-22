<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Amr, MapResource, MapTopology, Task } from '../../types/domain'

const props = defineProps<{
  amrs: Amr[]
  resources: MapResource[]
  tasks: Task[]
  topology: MapTopology
  selectedAmrId: string | null
  selectedTaskId: string | null
  inspectorOpen: boolean
  routeProgress: Record<string, number>
}>()

const emit = defineEmits<{ selectAmr: [id: string] }>()
const defaultMapScale = 1.16
const pan = ref({ x: 0, y: 0 })
const dragging = ref(false)
let dragOrigin = { x: 0, y: 0 }
let panOrigin = { x: 0, y: 0 }

const networkNodes = computed(() => props.topology.columns.flatMap((x, column) => props.topology.rows.map((y, row) => ({ x, y, id: `P-${String(column * props.topology.rows.length + row + 1).padStart(2, '0')}` }))))
const selectedAmr = computed(() => props.amrs.find((amr) => amr.id === props.selectedAmrId))
const visibleRouteTasks = computed(() => props.selectedTaskId
  ? props.tasks.filter(task => task.id === props.selectedTaskId && task.amrId && task.plannedPath)
  : [])
const selectedServiceResources = computed(() => selectedAmr.value?.dispatchStatus === 'paused'
  ? new Set<string>()
  : new Set([...(selectedAmr.value?.serviceDevices ?? []), ...(selectedAmr.value?.serviceStations ?? [])]))
const visibleResources = computed(() => props.resources.filter((resource) => resource.type === 'machine' || resource.type === 'home'))

function serviceAmrsForResource(resourceId: string) {
  return props.amrs.filter((amr) => amr.dispatchStatus !== 'paused' && (amr.serviceDevices.includes(resourceId) || amr.serviceStations.includes(resourceId)))
}

const mapTransform = computed(() => {
  let inspectorShift = 0
  if (!props.selectedAmrId || !props.inspectorOpen) return `translate(${pan.value.x}px, ${pan.value.y}px) scale(${defaultMapScale})`
  const position = selectedAmr.value?.position
  if (position && position.x >= 430) inspectorShift = -18
  return `translate(${pan.value.x}px, ${pan.value.y}px) translateX(${inspectorShift}%) scale(${defaultMapScale})`
})

const gridPosition = computed(() => `${pan.value.x}px ${pan.value.y}px`)

function startPan(event: PointerEvent) {
  if ((event.target as Element).closest('.map-amr, .map-route-legend')) return
  dragging.value = true
  dragOrigin = { x: event.clientX, y: event.clientY }
  panOrigin = { ...pan.value }
  const target = event.currentTarget as HTMLElement
  if (event.pointerId && target.setPointerCapture) {
    try { target.setPointerCapture(event.pointerId) } catch { /* 浏览器会继续通过移动事件完成平移 */ }
  }
}

function movePan(event: PointerEvent) {
  if (!dragging.value) return
  pan.value = {
    x: panOrigin.x + event.clientX - dragOrigin.x,
    y: panOrigin.y + event.clientY - dragOrigin.y,
  }
}

function endPan(event: PointerEvent) {
  dragging.value = false
  const target = event.currentTarget as HTMLElement
  if (event.pointerId && target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId)
}

</script>

<template>
  <section class="twin-map-wrap" aria-label="2D 数字孪生地图">
    <div
      class="map-canvas-stage"
      :class="{ 'is-dragging': dragging }"
      :style="{ backgroundPosition: gridPosition }"
      @pointerdown="startPan"
      @pointermove="movePan"
      @pointerup="endPan"
      @pointercancel="endPan"
    >
      <div class="map-route-legend"><span :class="{ muted: !selectedTaskId }"><i class="planned"></i>规划路径</span><span :class="{ muted: !selectedTaskId }"><i class="traveled"></i>已走路径</span></div>
      <svg class="twin-map" :style="{ transform: mapTransform }" viewBox="0 0 760 520" role="img" aria-label="装配物流区 AMR 实时交通图">
        <defs>
          <filter id="selection-shadow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#1677ff" flood-opacity=".32"/></filter>
        </defs>
        <g class="logic-route-network">
          <path v-for="x in topology.columns" :key="`v-${x}`" :d="`M${x} ${topology.rows[0]}V${topology.rows.at(-1)}`"/>
          <path v-for="path in topology.paths" :key="path" :d="path"/>
        </g>

        <g class="logic-network-nodes"><circle v-for="node in networkNodes" :key="node.id" :cx="node.x" :cy="node.y" r="3.5"/></g>

        <g class="selected-route-layer simulation-route-layer">
          <g v-for="task in visibleRouteTasks" :key="task.id" class="selected">
            <path class="route-planned" :d="task.plannedPath"/>
            <path v-if="task.status === '运行中'" class="route-traveled" :d="task.plannedPath" pathLength="1" :style="{ strokeDasharray: `${routeProgress[task.id] ?? 0} 1` }"/>
            <path v-else-if="task.traveledPath" class="route-traveled route-traveled-static" :d="task.traveledPath"/>
          </g>
        </g>

        <g class="logic-resource-layer">
          <g v-for="resource in visibleResources" :key="resource.id" :class="['logic-resource', `resource-${resource.type}`, resource.state, { 'service-highlight': selectedServiceResources.has(resource.id), muted: selectedAmrId && !selectedServiceResources.has(resource.id) }]" :transform="`translate(${resource.position.x} ${resource.position.y})`">
            <path d="M0 0V-8"/><rect x="-23" y="-27" width="46" height="18" rx="4"/>
            <g
              v-for="(serviceAmr, index) in serviceAmrsForResource(resource.id)"
              :key="`${resource.id}-${serviceAmr.id}`"
              :class="['resource-service-badge', { active: selectedAmrId === serviceAmr.id, 'badge-muted': selectedAmrId && selectedAmrId !== serviceAmr.id }]"
              :transform="`translate(${-16 + index * 14} -31)`"
            >
              <rect x="-6.5" y="-6.5" width="13" height="13" rx="2"/>
              <text y="2.4">{{ Number(serviceAmr.id.slice(-2)) }}</text>
            </g>
            <text y="-15">{{ resource.label }}</text>
          </g>
        </g>

        <g class="amr-layer">
          <g v-for="amr in amrs" :key="amr.id" :transform="`translate(${amr.position.x} ${amr.position.y})`" :class="['map-amr', amr.tone, { selected: selectedAmrId === amr.id, muted: selectedAmrId && selectedAmrId !== amr.id, 'dispatch-paused': amr.dispatchStatus === 'paused' }]" role="button" tabindex="0" :aria-label="`${amr.id}，${amr.status}${amr.dispatchStatus === 'paused' ? '，暂停接单' : ''}`" @click="emit('selectAmr', amr.id)" @keydown.enter="emit('selectAmr', amr.id)">
            <rect class="amr-hit-target" x="-22" y="-20" width="44" height="40" rx="10"/>
            <circle v-if="amr.tone === 'fault'" class="fault-pulse fault-pulse-one" r="18"/><circle v-if="amr.tone === 'fault'" class="fault-pulse fault-pulse-two" r="18"/>
            <circle class="selection-ring" r="17"/>
            <circle class="amr-body" r="12"/>
            <g class="amr-direction" :transform="`rotate(${amr.heading})`"><path d="M0-20L5-12L0-14L-5-12Z"/></g>
            <text class="amr-id" x="0" y="3.5">{{ amr.id.slice(-2) }}</text>
          </g>
        </g>
      </svg>
    </div>

  </section>
</template>
