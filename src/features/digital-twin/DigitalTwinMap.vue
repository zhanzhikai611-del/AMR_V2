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
// The former 125% view is the monitoring screen's new 100% baseline.
const MONITOR_ZOOM_BASE = 1.25
const zoom = ref(1)
const dragging = ref(false)
let dragOrigin = { clientX: 0, clientY: 0, x: 0, y: 0 }
let resizeObserver: ResizeObserver | undefined

const scale = computed(() => Math.min(fullViewport.value.width / MAP_FRAME.width, fullViewport.value.height / MAP_FRAME.height) * MONITOR_ZOOM_BASE * zoom.value)
const view = computed(() => {
  const width = viewport.value.width / scale.value, height = viewport.value.height / scale.value
  return { x: center.value.x - width / 2, y: center.value.y - height / 2, width, height }
})
const viewBox = computed(() => `${view.value.x} ${view.value.y} ${view.value.width} ${view.value.height}`)
const markerScale = computed(() => 1.2 * Math.min(1.15, Math.max(0.4, 1 / scale.value)))
const scaleBar = computed(() => getMapScaleBar(scale.value, mapMetersPerUnit(props.map?.resolution)))
const selectedAmr = computed(() => props.amrs.find(amr => amr.id === props.selectedAmrId))
const selectedServiceDevices = computed(() => new Set(selectedAmr.value?.serviceDevices ?? []))
const visibleAmrs = computed(() => props.amrs.filter(amr => amr.connectionStatus !== 'offline' && amr.status !== '离线'))
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
function pathPoints(path: string) {
  return [...path.matchAll(/[ML]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/gi)].map(match => ({ x: Number(match[1]), y: Number(match[2]) }))
}
function pathData(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join('')
}
function splitRouteAtVehicle(task: Task) {
  const points = pathPoints(task.plannedPath)
  const vehicle = props.amrs.find(amr => amr.id === task.amrId)
  if (!vehicle || points.length < 2) return { traveledPath: task.traveledPath, remainingPath: task.plannedPath }
  let nearest = { segment: 0, t: 0, distance: Infinity, point: points[0]! }
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!, end = points[index + 1]!
    const dx = end.x - start.x, dy = end.y - start.y
    const lengthSquared = dx * dx + dy * dy
    const t = lengthSquared ? Math.max(0, Math.min(1, ((vehicle.position.x - start.x) * dx + (vehicle.position.y - start.y) * dy) / lengthSquared)) : 0
    const point = { x: start.x + dx * t, y: start.y + dy * t }
    const distance = Math.hypot(vehicle.position.x - point.x, vehicle.position.y - point.y)
    if (distance < nearest.distance) nearest = { segment: index, t, distance, point }
  }
  const traveled = [...points.slice(0, nearest.segment + 1), nearest.point]
  const remaining = [nearest.point, ...points.slice(nearest.segment + 1)]
  return { traveledPath: pathData(traveled), remainingPath: pathData(remaining) }
}
const visibleRouteTasks = computed(() => props.tasks.filter(task =>
  task.amrId && task.plannedPath && (task.status === '执行中' || task.status === '异常'))
  .map(task => ({ ...task, ...splitRouteAtVehicle(task) })))
const isServiceActive = (amr: Pick<Amr, 'connectionStatus' | 'status'>) => amr.connectionStatus !== 'offline' && amr.status !== '离线' && amr.status !== '停用'
const selectedTaskDestination = computed(() => {
  const amr = selectedAmr.value
  if (!amr || !isServiceActive(amr)) return null
  return props.tasks.find(task => task.id === amr.taskId && task.amrId === amr.id && task.status === '执行中')?.requestDeviceId ?? null
})
const taskStateByDevice = computed(() => {
  const states = new Map<string, 'active' | 'fault'>()
  for (const task of props.tasks) {
    if (task.status === '异常') states.set(task.requestDeviceId, 'fault')
    else if (task.status === '执行中' && !states.has(task.requestDeviceId)) states.set(task.requestDeviceId, 'active')
  }
  return states
})
function stationLabel(point: MapStation) { return deviceIndex.value.get(point.deviceId)?.label ?? point.name }
const labelLayouts = computed(() => layoutStationLabels(deviceStations.value.map(point => ({
  id: point.id, x: point.x, y: point.y, title: stationLabel(point), yaw: point.yaw,
  direction: deviceIndex.value.get(point.deviceId)?.direction,
}))).map(layout => ({ ...layout, point: pointIndex.value.get(layout.id)! })))
function amrCode(amr: Amr) {
  const match = amr.name.match(/_([A-Z])_0*(\d+)$/i)
  return match ? `${match[1]!.toUpperCase()}${match[2]}` : amr.id.replace(/^AMR-0*/i, '')
}
function stationTitle(point: MapStation) {
  return `${point.name} · ${point.deviceId ? stationLabel(point) : '未关联设备'}${point.disabled ? ' · 已禁用' : ''}`
}
function stationClasses(point: MapStation) {
  const taskState = taskStateByDevice.value.get(point.deviceId)
  const selectedDestination = selectedTaskDestination.value === point.deviceId
  const serviceScopeVisible = Boolean(selectedAmr.value)
  const belongsToSelectedAmr = selectedServiceDevices.value.has(point.deviceId)
  return { 'selected-destination': selectedDestination,
    'task-active': taskState === 'active', 'task-fault': taskState === 'fault',
    'service-highlight': serviceScopeVisible && belongsToSelectedAmr,
    muted: serviceScopeVisible && !belongsToSelectedAmr,
    focused: hoveredStationId.value === point.id,
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
function setFittedZoom(multiplier: number) {
  const fullScale = Math.min(fullViewport.value.width / MAP_FRAME.width, fullViewport.value.height / MAP_FRAME.height)
  zoom.value = Math.min(viewport.value.width / MAP_FRAME.width, viewport.value.height / MAP_FRAME.height) / fullScale * multiplier / MONITOR_ZOOM_BASE
  center.value = { x: MAP_FRAME.width / 2, y: MAP_FRAME.height / 2 }
}
function fitMap() { setFittedZoom(MONITOR_ZOOM_BASE) }
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
watch(() => props.map?.mapId, () => setFittedZoom(1.25))
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
          <filter id="station-glow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#e7bd62" flood-opacity=".42" /></filter>
          <filter id="station-hover-glow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="1.1" flood-color="#d7e0e7" flood-opacity=".42" /></filter>
          <filter id="station-active-glow" x="-150%" y="-150%" width="400%" height="400%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="1.1" flood-color="#1677ff" flood-opacity=".28" /><feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#1677ff" flood-opacity=".12" /></filter>
          <filter id="station-fault-glow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="0" stdDeviation="1.2" flood-color="#e5484d" flood-opacity=".55" /></filter>
          <linearGradient id="station-active-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b8cff" /><stop offset="1" stop-color="#1267df" /></linearGradient>
        </defs>
        <rect :x="view.x" :y="view.y" :width="view.width" :height="view.height" fill="url(#monitor-grid)" />
        <MapPointcloud v-if="layers.pointcloud" class="monitor-pointcloud" />
        <g v-if="layers.network" class="monitor-network">
          <line v-for="route in mapRoutes" :key="route.id" :x1="route.start.x" :y1="route.start.y" :x2="route.end.x" :y2="route.end.y" :class="{ disabled: route.disabled }" />
        </g>
        <g class="selected-route-layer simulation-route-layer monitor-task-routes">
          <g v-for="task in visibleRouteTasks" :key="task.id" :class="{ selected: selectedTaskId === task.id, muted: selectedTaskId && selectedTaskId !== task.id }">
            <path class="route-planned" :d="task.remainingPath" />
            <path v-if="task.traveledPath" class="route-traveled" :d="task.traveledPath" />
          </g>
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
        <g v-if="layers.devices && layers.deviceLabels" class="monitor-device-labels">
          <g v-for="layout in labelLayouts" :key="`leader-${layout.id}`" class="monitor-label-connector" :class="stationClasses(layout.point)">
            <path class="label-leader" :d="layout.leader" />
          </g>
          <g v-for="layout in labelLayouts" :key="layout.id" data-map-interactive class="monitor-device-label monitor-device-label--horizontal"
            :class="stationClasses(layout.point)" :transform="`translate(${layout.x} ${layout.y})`"
            :aria-label="`设备 ${stationLabel(layout.point)}`" @pointerenter="hoveredStationId = layout.id" @pointerleave="hoveredStationId = null">
            <rect class="device-nameplate" :width="layout.width" :height="layout.height" rx="2.4" />
            <text class="device-nameplate-code" :x="layout.width / 2" :y="layout.height / 2" dominant-baseline="central">{{ stationLabel(layout.point) }}</text>
            <title>{{ stationTitle(layout.point) }}</title>
          </g>
        </g>
        <g class="amr-layer">
          <g v-for="amr in visibleAmrs" :key="amr.id" data-map-interactive :transform="`translate(${amr.position.x} ${amr.position.y}) scale(${markerScale})`" :class="['map-amr', amr.tone, { selected: selectedAmrId === amr.id, muted: selectedAmrId && selectedAmrId !== amr.id, 'dispatch-paused': amr.status === '停用' }]" role="button" tabindex="0" :aria-label="`${amr.id}，${amr.status}`" @click="chooseAmr(amr.id)" @keydown.enter.stop.prevent="chooseAmr(amr.id)" @keydown.space.stop.prevent="chooseAmr(amr.id)">
            <rect class="amr-hit-target" x="-21" y="-27" width="42" height="54" rx="10" />
            <circle v-if="amr.tone === 'fault'" class="fault-pulse fault-pulse-one" r="18" /><circle v-if="amr.tone === 'fault'" class="fault-pulse fault-pulse-two" r="18" />
            <rect class="selection-ring" x="-17" y="-24" width="34" height="48" rx="10" />
            <g class="amr-chassis" :transform="`rotate(${amr.heading}) scale(.34) translate(-42 -59)`">
              <ellipse class="amr-floor-shadow" cx="42" cy="62" rx="31" ry="48" />
              <path class="amr-direction" d="M42 2 48 11H36Z" />
              <rect class="amr-wheel" x="7" y="35" width="8" height="38" rx="3.5" />
              <rect class="amr-wheel" x="69" y="35" width="8" height="38" rx="3.5" />
              <path class="amr-side" d="M20 17h44c6 0 10 5 10 11v62c0 10-7 17-17 17H27c-10 0-17-7-17-17V28c0-6 4-11 10-11Z" />
              <path class="amr-body" d="M21 12h42c6 0 10 5 10 11v62c0 10-7 16-16 16H27c-9 0-16-6-16-16V23c0-6 4-11 10-11Z" />
              <path class="amr-front" d="M22 12h40c5 0 9 3 11 8l-9 8H20l-9-8c2-5 6-8 11-8Z" />
              <circle class="amr-sensor" cx="20" cy="20" r="2.6" />
              <circle class="amr-sensor" cx="64" cy="20" r="2.6" />
              <rect class="amr-deck" x="18" y="33" width="48" height="50" rx="7" />
              <path class="amr-deck-detail" d="M24 40h8M52 40h8M24 76h8M52 76h8" />
              <rect class="amr-id-plate" x="23" y="45" width="38" height="27" rx="5" />
              <path class="amr-light-glow" d="M25 19h34" />
              <path class="amr-light" d="M25 19h34" />
              <path class="amr-light-glow amr-tail-light-glow" d="M26 96h32" />
              <path class="amr-light amr-tail-light" d="M26 96h32" />
              <text class="amr-id" x="42" y="64" :transform="`rotate(${-amr.heading} 42 59)`">{{ amrCode(amr) }}</text>
            </g>
            <g v-if="amr.tone === 'fault'" class="amr-alert" transform="translate(12 -18)">
              <circle r="5" />
              <text x="0" y="2.4">!</text>
            </g>
          </g>
        </g>
      </svg>
      <div class="map-route-legend monitor-route-legend"><span><i class="planned"></i>规划路径</span><span><i class="traveled"></i>已走路径</span></div>
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
