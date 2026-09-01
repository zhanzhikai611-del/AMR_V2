<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Amr, MapResource, MapStation, RuntimeMap, Task } from '../../types/domain'
import MapPointcloud from '../maps/MapPointcloud.vue'
import { getMapScaleBar, mapMetersPerUnit, MAP_FRAME } from '../maps/map-geometry'
import { layoutStationLabels } from './station-label-layout'

const props = defineProps<{
  amrs: Amr[]
  resources: MapResource[]
  tasks: Task[]
  map?: RuntimeMap
  simulation: boolean
  selectedAmrId: string | null
  selectedTaskId: string | null
  inspectorOpen: boolean
  routeProgress: Record<string, number>
}>()
const emit = defineEmits<{ selectAmr: [id: string] }>()
const canvas = ref<SVGSVGElement | null>(null)
const controls = ref<HTMLElement | null>(null)
const layerButton = ref<HTMLButtonElement | null>(null)
const layersOpen = ref(false)
const hoveredStationId = ref<string | null>(null)
const defaultLayers = { pointcloud: true, network: true, devices: true, navigation: false, parking: false, charging: false,
  deviceLabels: true, navigationLabels: false, parkingLabels: false, chargingLabels: false }
const layers = reactive({ ...defaultLayers })
const baseLayerOptions = [
  { key: 'pointcloud', label: '点云地图', icon: 'cloud' },
  { key: 'network', label: '路线', icon: 'network' },
] as const
const stationLayerOptions = [
  { key: 'devices', labelKey: 'deviceLabels', label: '设备站点', icon: 'station' },
  { key: 'navigation', labelKey: 'navigationLabels', label: '一般站点', icon: 'other' },
  { key: 'parking', labelKey: 'parkingLabels', label: '停车点', icon: 'parking' },
  { key: 'charging', labelKey: 'chargingLabels', label: '充电点', icon: 'charge' },
] as const
const layerOptions = [...baseLayerOptions, ...stationLayerOptions]
const viewport = ref({ width: 760, height: 520 })
const fullViewport = ref({ width: 760, height: 520 })
const center = ref({ x: MAP_FRAME.width / 2, y: MAP_FRAME.height / 2 })
const zoom = ref(1)
const dragging = ref(false)
let dragOrigin = { clientX: 0, clientY: 0, x: 0, y: 0 }
let resizeObserver: ResizeObserver | undefined

const scale = computed(() => Math.min(fullViewport.value.width / MAP_FRAME.width, fullViewport.value.height / MAP_FRAME.height) * zoom.value)
const view = computed(() => {
  const width = viewport.value.width / scale.value, height = viewport.value.height / scale.value
  return { x: center.value.x - width / 2, y: center.value.y - height / 2, width, height }
})
const viewBox = computed(() => `${view.value.x} ${view.value.y} ${view.value.width} ${view.value.height}`)
const markerScale = computed(() => Math.min(1.15, Math.max(0.4, 1 / scale.value)))
const scaleBar = computed(() => getMapScaleBar(scale.value, mapMetersPerUnit(props.map?.resolution)))
const selectedAmr = computed(() => props.amrs.find(amr => amr.id === props.selectedAmrId))
const pointIndex = computed(() => new Map(props.map?.points.map(point => [point.id, point]) ?? []))
const deviceIndex = computed(() => new Map(props.resources.map(resource => [resource.id, resource])))
const mapRoutes = computed(() => (props.map?.routes ?? []).flatMap(route => {
  const start = pointIndex.value.get(route.startId), end = pointIndex.value.get(route.endId)
  return start && end ? [{ ...route, start, end }] : []
}))
const deviceStations = computed(() => props.map?.points.filter(point => point.associationType === 'dock') ?? [])
const otherStations = computed(() => props.map?.points.filter(point =>
  (point.associationType === 'none' && layers.navigation) ||
  (point.associationType === 'parking' && layers.parking) ||
  (point.associationType === 'charge' && layers.charging),
) ?? [])
const visibleRouteTasks = computed(() => props.selectedTaskId
  ? props.tasks.filter(task => task.id === props.selectedTaskId && task.amrId && task.plannedPath) : [])
const isServiceActive = (amr: Pick<Amr, 'connectionStatus' | 'status'>) => amr.connectionStatus !== 'offline' && amr.status !== '离线' && amr.status !== '停用'
const selectedServiceResources = computed(() => selectedAmr.value && isServiceActive(selectedAmr.value)
  ? new Set(selectedAmr.value.serviceDevices) : new Set<string>())
const taskStateByDevice = computed(() => {
  const states = new Map<string, 'active' | 'fault'>()
  for (const task of props.tasks) {
    if (task.status === '异常') states.set(task.requestDeviceId, 'fault')
    else if (task.status === '执行中' && !states.has(task.requestDeviceId)) states.set(task.requestDeviceId, 'active')
  }
  return states
})
// Names and fixed station geometry determine layout; vehicle motion and service
// membership do not change the label footprint or cause positions to jump.
const labelLayouts = computed(() => layoutStationLabels(deviceStations.value.map(point => ({
  id: point.id, x: point.x, y: point.y, title: stationLabel(point),
}))).map(layout => ({ ...layout, point: pointIndex.value.get(layout.id)! })))
function stationLabel(point: MapStation) { return deviceIndex.value.get(point.deviceId)?.label ?? point.name }
function stationTitle(point: MapStation) {
  return `${point.name} · ${point.deviceId ? stationLabel(point) : '未关联设备'}${point.disabled ? ' · 已禁用' : ''}`
}
function stationClasses(point: MapStation) {
  const taskState = taskStateByDevice.value.get(point.deviceId)
  return { 'service-highlight': selectedServiceResources.value.has(point.deviceId),
    'task-active': taskState === 'active', 'task-fault': taskState === 'fault',
    focused: hoveredStationId.value === point.id,
    muted: Boolean(props.selectedAmrId && !selectedServiceResources.value.has(point.deviceId) && !taskState && hoveredStationId.value !== point.id),
    disabled: point.disabled }
}
function otherStationLabelVisible(point: MapStation) {
  return (point.associationType === 'none' && layers.navigationLabels) ||
    (point.associationType === 'parking' && layers.parkingLabels) ||
    (point.associationType === 'charge' && layers.chargingLabels)
}
function chooseAmr(id: string) { emit('selectAmr', id) }
function measure() {
  const rect = canvas.value?.getBoundingClientRect()
  if (rect && rect.width > 0 && rect.height > 0) viewport.value = { width: rect.width, height: rect.height }
  const full = canvas.value?.closest('.twin-stage')?.getBoundingClientRect()
  if (full && full.width > 0 && full.height > 0) fullViewport.value = { width: full.width, height: full.height }
}
function fitMap() {
  const fullScale = Math.min(fullViewport.value.width / MAP_FRAME.width, fullViewport.value.height / MAP_FRAME.height)
  zoom.value = Math.min(viewport.value.width / MAP_FRAME.width, viewport.value.height / MAP_FRAME.height) / fullScale
  center.value = { x: MAP_FRAME.width / 2, y: MAP_FRAME.height / 2 }
}
function changeZoom(next: number) { zoom.value = Math.max(0.5, Math.min(4, next)) }
function wheel(event: WheelEvent) {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return
  const dx = event.clientX - rect.left - rect.width / 2, dy = event.clientY - rect.top - rect.height / 2
  const anchor = { x: center.value.x + dx / scale.value, y: center.value.y + dy / scale.value }
  changeZoom(zoom.value * Math.exp(-event.deltaY * 0.0015))
  center.value = { x: anchor.x - dx / scale.value, y: anchor.y - dy / scale.value }
}
function startPan(event: PointerEvent) {
  if (event.button !== 0 || (event.target as Element).closest('[data-map-interactive]')) return
  dragging.value = true
  dragOrigin = { clientX: event.clientX, clientY: event.clientY, ...center.value }
  canvas.value?.setPointerCapture(event.pointerId)
}
function movePan(event: PointerEvent) {
  if (!dragging.value) return
  center.value = { x: dragOrigin.x - (event.clientX - dragOrigin.clientX) / scale.value,
    y: dragOrigin.y - (event.clientY - dragOrigin.clientY) / scale.value }
}
function endPan(event: PointerEvent) {
  dragging.value = false
  if (canvas.value?.hasPointerCapture(event.pointerId)) canvas.value.releasePointerCapture(event.pointerId)
}
function closeLayers(restoreFocus = false) { layersOpen.value = false; if (restoreFocus) layerButton.value?.focus() }
function outsidePointer(event: PointerEvent) { if (layersOpen.value && !controls.value?.contains(event.target as Node)) closeLayers() }
function escape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (layersOpen.value) closeLayers(true)
}
function keepSelectionVisible() {
  const point = selectedAmr.value?.position
  if (!point) return
  const inset = 48 / scale.value
  const left = view.value.x + inset, right = view.value.x + view.value.width - inset
  const top = view.value.y + inset, bottom = view.value.y + view.value.height - inset
  center.value = { x: center.value.x + (point.x < left ? point.x - left : point.x > right ? point.x - right : 0),
    y: center.value.y + (point.y < top ? point.y - top : point.y > bottom ? point.y - bottom : 0) }
}
watch(() => [props.selectedAmrId, props.inspectorOpen], async () => { await nextTick(); measure(); keepSelectionVisible() })
watch(() => props.map?.mapId, fitMap)
onMounted(() => {
  measure()
  resizeObserver = new ResizeObserver(() => { measure(); keepSelectionVisible() })
  if (canvas.value) resizeObserver.observe(canvas.value)
  document.addEventListener('pointerdown', outsidePointer, true)
  document.addEventListener('keydown', escape)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('pointerdown', outsidePointer, true)
  document.removeEventListener('keydown', escape)
})
</script>

<template>
  <section class="twin-map-wrap monitor-map" :class="{ 'is-inspecting': inspectorOpen, 'selection-collapsed': !inspectorOpen && Boolean(selectedAmrId || selectedTaskId) }" aria-label="AMR 实时地图">
    <template v-if="map">
      <svg ref="canvas" class="monitor-canvas" :class="{ 'is-dragging': dragging }" :viewBox="viewBox" role="img" :aria-label="`${map.name} AMR 实时交通图`"
        @wheel.prevent="wheel" @pointerdown="startPan" @pointermove="movePan" @pointerup="endPan" @pointercancel="endPan" @lostpointercapture="dragging = false">
        <defs>
          <pattern id="monitor-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#dce4ea" stroke-width="0.5" /></pattern>
          <filter id="selection-shadow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#1677ff" flood-opacity=".32" /></filter>
          <filter id="station-glow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#58a6ff" flood-opacity=".42" /></filter>
          <filter id="station-hover-glow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="1.35" flood-color="#58a6ff" flood-opacity=".6" /></filter>
          <filter id="station-active-glow" x="-150%" y="-150%" width="400%" height="400%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="1.15" flood-color="#79c7ff" flood-opacity=".88" /><feDropShadow dx="0" dy="0" stdDeviation="2.8" flood-color="#4aa8ef" flood-opacity=".3" /></filter>
          <filter id="station-fault-glow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="1.2" flood-color="#e5484d" flood-opacity=".55" /></filter>
        </defs>
        <rect :x="view.x" :y="view.y" :width="view.width" :height="view.height" fill="url(#monitor-grid)" />
        <MapPointcloud v-if="layers.pointcloud" class="monitor-pointcloud" />
        <g v-if="layers.network" class="monitor-network">
          <line v-for="route in mapRoutes" :key="route.id" :x1="route.start.x" :y1="route.start.y" :x2="route.end.x" :y2="route.end.y" :class="{ disabled: route.disabled }" />
        </g>
        <g class="monitor-other-stations">
          <g v-for="point in otherStations" :key="point.id" :transform="`translate(${point.x} ${point.y})`" :class="[point.associationType, { disabled: point.disabled }]">
            <title>{{ point.name }}</title><path d="M0-2.5L2.3 2L-2.3 2Z" :transform="`rotate(${point.yaw * 180 / Math.PI})`" />
            <text v-if="otherStationLabelVisible(point)" x="0" y="-4.5">{{ point.name }}</text>
          </g>
        </g>
        <g v-if="layers.devices" class="monitor-stations">
          <g v-for="point in deviceStations" :key="point.id" data-map-interactive :data-station-id="point.id" :data-device-id="point.deviceId" :class="stationClasses(point)" :transform="`translate(${point.x} ${point.y})`" :aria-label="`设备站点 ${stationLabel(point)}`" @pointerenter="hoveredStationId = point.id" @pointerleave="hoveredStationId = null">
            <title>{{ stationTitle(point) }}</title><circle class="station-hit-target" r="4" />
            <path class="station-symbol" d="M0-2.5L2.3 2L-2.3 2Z" :transform="`rotate(${point.yaw * 180 / Math.PI})`" />
          </g>
        </g>
        <g class="selected-route-layer simulation-route-layer monitor-task-routes">
          <g v-for="task in visibleRouteTasks" :key="task.id" class="selected">
            <path class="route-planned" :d="task.plannedPath" />
            <!-- Keep progress in map coordinates; compensate only the stroke width
                 so zoom cannot change the traveled distance relative to the AMR. -->
            <path v-if="simulation && task.status === '执行中'" class="route-traveled route-traveled-simulated" :d="task.plannedPath" pathLength="1" :style="{ strokeDasharray: `${routeProgress[task.id] ?? 0} 1`, strokeWidth: 3 / scale }" />
            <path v-else-if="task.traveledPath" class="route-traveled route-traveled-static" :d="task.traveledPath" />
          </g>
        </g>
        <g v-if="layers.devices && layers.deviceLabels" class="monitor-device-labels">
          <g v-for="layout in labelLayouts" :key="`leader-${layout.id}`" class="monitor-label-connector" :class="stationClasses(layout.point)" :data-leader-station-id="layout.id">
            <path class="label-leader" :d="layout.leader" />
          </g>
          <g v-for="layout in labelLayouts" :key="layout.id" data-map-interactive class="monitor-device-label" :data-label-station-id="layout.id" :class="stationClasses(layout.point)" :transform="`translate(${layout.x} ${layout.y})`" @pointerenter="hoveredStationId = layout.id" @pointerleave="hoveredStationId = null">
            <rect class="device-nameplate" :width="layout.width" :height="layout.height" rx="1.6" />
            <g data-map-interactive class="station-card-title" :aria-label="`设备 ${stationLabel(layout.point)}`">
              <rect class="station-title-hit" :width="layout.width" :height="layout.height" rx="1.6" />
              <text :x="layout.width / 2" :y="layout.height / 2" dominant-baseline="central">{{ stationLabel(layout.point) }}</text>
            </g>
            <title>{{ stationTitle(layout.point) }}</title>
          </g>
        </g>
        <g class="amr-layer">
          <g v-for="amr in amrs" :key="amr.id" data-map-interactive :transform="`translate(${amr.position.x} ${amr.position.y}) scale(${markerScale})`" :class="['map-amr', amr.tone, { selected: selectedAmrId === amr.id, muted: selectedAmrId && selectedAmrId !== amr.id, 'dispatch-paused': amr.status === '停用' }]" role="button" tabindex="0" :aria-label="`${amr.id}，${amr.status}`" @click="chooseAmr(amr.id)" @keydown.enter.stop.prevent="chooseAmr(amr.id)" @keydown.space.stop.prevent="chooseAmr(amr.id)">
            <rect class="amr-hit-target" x="-22" y="-20" width="44" height="40" rx="10" />
            <circle v-if="amr.tone === 'fault'" class="fault-pulse fault-pulse-one" r="18" /><circle v-if="amr.tone === 'fault'" class="fault-pulse fault-pulse-two" r="18" />
            <circle class="selection-ring" r="17" /><circle class="amr-body" r="12" />
            <g class="amr-direction" :transform="`rotate(${amr.heading})`"><path d="M0-20L5-12L0-14L-5-12Z" /></g>
            <text class="amr-id" x="0" y="3.5">{{ amr.id.slice(-2) }}</text>
          </g>
        </g>
      </svg>
      <div class="map-route-legend monitor-route-legend"><span :class="{ muted: !selectedTaskId }"><i class="planned"></i>规划路径</span><span :class="{ muted: !selectedTaskId }"><i class="traveled"></i>已走路径</span></div>
      <div ref="controls" class="monitor-layer-control">
        <button ref="layerButton" type="button" class="monitor-tool-button layer-trigger" :class="{ active: layersOpen }" :aria-expanded="layersOpen" aria-controls="monitor-layer-panel" @click="layersOpen = !layersOpen">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 3 7 4-7 4-7-4 7-4Zm-7 8 7 4 7-4M3 15l7 4 7-4" /></svg><span>图层</span><span class="layer-count">{{ layerOptions.length }}</span>
        </button>
        <section v-if="layersOpen" id="monitor-layer-panel" class="monitor-layer-panel" aria-label="地图图层">
          <header><strong>地图图层</strong><div class="layer-header-actions"><button type="button" class="layer-reset" @click="Object.assign(layers, defaultLayers)">恢复默认图层</button><button type="button" class="layer-close" aria-label="关闭图层面板" @click="closeLayers(true)">×</button></div></header>
          <label v-for="option in baseLayerOptions" :key="option.key" class="monitor-layer-row">
            <i class="layer-swatch" :class="option.icon" aria-hidden="true"></i><strong>{{ option.label }}</strong><input v-model="layers[option.key]" type="checkbox" :aria-label="option.label" />
          </label>
          <div class="station-layer-group">
            <div class="station-layer-heading"><strong>站点</strong><span>站点</span><span>标签</span></div>
            <div v-for="option in stationLayerOptions" :key="option.key" class="monitor-layer-row station-layer-row">
              <i class="layer-swatch" :class="option.icon" aria-hidden="true"></i><strong>{{ option.label }}</strong>
              <label class="layer-cell-check"><input v-model="layers[option.key]" type="checkbox" :aria-label="`显示${option.label}`" /></label>
              <label class="layer-cell-check" :class="{ disabled: !layers[option.key] }"><input v-model="layers[option.labelKey]" type="checkbox" :disabled="!layers[option.key]" :aria-label="`显示${option.label}标签`" /></label>
            </div>
          </div>
        </section>
      </div>
      <div class="monitor-view-tools" aria-label="地图视图"><button type="button" aria-label="缩小地图" :disabled="zoom <= 0.5" @click="changeZoom(zoom / 1.25)">−</button><span>{{ Math.round(zoom * 100) }}%</span><button type="button" aria-label="放大地图" :disabled="zoom >= 4" @click="changeZoom(zoom * 1.25)">＋</button><button type="button" @click="fitMap">适应地图</button></div>
      <div class="map-distance-scale monitor-distance-scale" aria-label="地图比例尺"><span>{{ scaleBar.meters }} m</span><i :style="{ width: `${scaleBar.pixels}px` }"><b></b></i></div>
    </template>
    <div v-else class="page-state"><strong>尚未提供已生效的运行地图</strong><span>请确认运行数据包含地图版本、站点与路线。</span></div>
  </section>
</template>

<style scoped src="./monitor-map.css"></style>
