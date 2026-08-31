<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMapDraft, publishMapDraft, saveMapDraft } from '../api/modules/maps'
import { getResourceCatalog } from '../api/modules/resources'
import type { MapControlZone, MapDefinition, MapEditorDraft, MapEditorTool, MapRoute, MapStation, StationAssociationType } from '../types/domain'
import MapPointcloud from '../features/maps/MapPointcloud.vue'
import { MAP_FRAME } from '../features/maps/map-geometry'

type Selection = { kind:'point'|'route'|'zone'; id:string } | null
const MAP_WIDTH = MAP_FRAME.width
const MAP_HEIGHT = MAP_FRAME.height
const route = useRoute(); const router = useRouter(); const mapId = String(route.params.id)
const draft = ref<MapEditorDraft>(); const mapInfo = ref<MapDefinition>(); const tool = ref<MapEditorTool>('select')
const zoom = ref(100); const selected = ref<Selection>(null); const dirty = ref(false); const saving = ref(false); const notice = ref(''); const cursor = ref({x:0,y:0}); const zoneSpeedLimit = ref(0.5)
const publishConfirm = ref(false)
const deleteRequest = ref<NonNullable<Selection> | null>(null)
const history = ref<MapEditorDraft[]>([])
const cameraCenter = ref({x:MAP_WIDTH/2,y:MAP_HEIGHT/2}); const panning = ref(false); const zoneDragging = ref(false)
let panStart = {clientX:0,clientY:0,centerX:0,centerY:0}; let panMoved = false
const propertyCollapsed = ref(false)
const deviceOptions = ref<Array<{id:string;label:string;type:string}>>([])
const pending = ref<{first?: {x:number;y:number}; startId?:string; endId?:string; zoneDrag?: {anchor:{x:number;y:number}; current:{x:number;y:number}} }>({})
const bidirectional = ref(true); const backwards = ref(false); const speed = ref(1.2); const zoneType = ref('互斥区 · 同时允许 1 台 AMR')
const tools: Array<{id:MapEditorTool;label:string}> = [{id:'select',label:'选择'},{id:'point',label:'新增站点'},{id:'route',label:'连接路线'},{id:'zone',label:'绘制管制区'}]
const toolLabel = computed(() => tools.find(item=>item.id===tool.value)?.label ?? '')
const toolHint = computed(() => ({select:'点击地图对象查看属性；拖动画布，滚轮缩放。',point:'点击可创建站点。',route:'依次选择起点与终点，建立站点之间的直线路线。',zone:'按住拖拽绘制矩形管制区域。'}[tool.value]))
const viewBox = computed(() => {
  const width=MAP_WIDTH/(zoom.value/100); const height=MAP_HEIGHT/(zoom.value/100)
  return `${cameraCenter.value.x-width/2} ${cameraCenter.value.y-height/2} ${width} ${height}`
})
const labelsVisible = computed(() => zoom.value >= 170)
const symbolScale = computed(() => Math.min(1.15, 100/zoom.value))
const selectedObject = computed(() => {
  if (!draft.value || !selected.value) return null
  const pools = { point:draft.value.points, route:draft.value.routes, zone:draft.value.zones }
  return pools[selected.value.kind].find(item => item.id === selected.value?.id) ?? null
})
const selectedPoint = computed(() => selected.value?.kind === 'point' ? selectedObject.value as MapStation : null)
const selectedRoute = computed(() => selected.value?.kind === 'route' ? selectedObject.value as MapRoute : null)
const selectedZone = computed(() => selected.value?.kind === 'zone' ? selectedObject.value as MapControlZone : null)
const zoneTypeOptions:Array<{value:string;label:string;hint:string}> = [
  {value:'互斥区 · 同时允许 1 台 AMR',label:'互斥区',hint:'同一时间只允许 1 台 AMR 进入'},
  {value:'限速区 · 限制通行速度',label:'限速区',hint:'限制 AMR 在区域内的行驶速度'},
  {value:'禁行区 · 不允许路线穿越',label:'禁行区',hint:'禁止任何 AMR 进入该区域'},
]
const selectedZoneType = computed(() => zoneTypeOptions.find(item=>item.value===selectedZone.value?.type))
const isSpeedZone = computed(() => Boolean(selectedZone.value?.type.includes('限速')))
const associationTypes: Array<{value:StationAssociationType;label:string;hint:string}> = [
  {value:'none',label:'普通导航点',hint:'仅用于导航和路网连接'},
  {value:'dock',label:'设备对接点',hint:'供 AMR 在设备旁停靠并执行任务'},
  {value:'charge',label:'充电点',hint:'供 AMR 到达充电设备进行充电'},
  {value:'parking',label:'Home / 停车点',hint:'供 AMR 待命或返回 Home'},
]
const filteredDeviceOptions = computed(() => {
  const type=selectedPoint.value?.associationType ?? 'none'
  if(type==='dock') return deviceOptions.value.filter(device=>['machine','buffer','recycle'].includes(device.type))
  if(type==='charge') return deviceOptions.value.filter(device=>device.type==='charge')
  return []
})
const selectedAssociation = computed(() => associationTypes.find(item=>item.value===(selectedPoint.value?.associationType ?? 'none')))
const deleteTitle = computed(() => {
  if(!deleteRequest.value)return ''
  const labels={point:'站点',route:'路线',zone:'管制区'}
  return `删除${labels[deleteRequest.value.kind]} ${deleteRequest.value.id}？`
})
const deleteDescription = computed(() => {
  if(!deleteRequest.value)return ''
  if(deleteRequest.value.kind==='point'){
    const count=draft.value?.routes.filter(route=>route.startId===deleteRequest.value?.id||route.endId===deleteRequest.value?.id).length ?? 0
    return `将同时删除连接该站点的 ${count} 条路线。此操作无法撤销。`
  }
  return deleteRequest.value.kind==='route'?'将删除这两个站点之间的当前连接。此操作无法撤销。':'将删除当前管制区域。此操作无法撤销。'
})
const selectedPointYaw = computed({
  get: () => Math.round(((selectedPoint.value?.yaw ?? 0) * 180 / Math.PI) * 10) / 10,
  set: (degrees:number) => { if(selectedPoint.value){ selectedPoint.value.yaw=degrees*Math.PI/180; dirty.value=true } },
})
function markDirty(){ dirty.value=true }
function pushHistory(){ if(!draft.value)return; history.value.push(structuredClone(toRaw(draft.value))); if(history.value.length>30)history.value.shift() }
function undo(){ const previous=history.value.pop(); if(!previous)return; draft.value=previous; selected.value=null; deleteRequest.value=null; dirty.value=true; notice.value='已撤销上一步操作' }
function beginPropertyEdit(event:FocusEvent){ const target=event.target as HTMLInputElement; if(target.matches('input:not([readonly]),select,textarea')&&!target.disabled)pushHistory() }
function setAssociationType(type:StationAssociationType){
  if(!selectedPoint.value)return
  selectedPoint.value.associationType=type
  selectedPoint.value.deviceId=''
  selectedPoint.value.charged=type==='charge'
  selectedPoint.value.parkable=type==='parking'
  selectedPoint.value.dockable=type==='dock'
  selectedPoint.value.options.parkable.boolValue=selectedPoint.value.parkable
  selectedPoint.value.options.poseType.stringValue=selectedPoint.value.dockable?'DOCK':'NORMAL'
  markDirty()
}
function pointById(id:string) { return draft.value?.points.find(point=>point.id===id) }
function pointYawDegrees(point:MapStation){ return point.yaw*180/Math.PI }
function isPointInZone(x:number,y:number,zone:MapControlZone){ return x>=zone.x && x<=zone.x+zone.width && y>=zone.y && y<=zone.y+zone.height }
function segmentIntersectsZone(x1:number,y1:number,x2:number,y2:number,zone:MapControlZone){
  if(isPointInZone(x1,y1,zone) || isPointInZone(x2,y2,zone)) return true
  const left=zone.x, right=zone.x+zone.width, top=zone.y, bottom=zone.y+zone.height
  const dx=x2-x1, dy=y2-y1
  const clip=(p:number,d:number,lo:number,hi:number)=>{ if(Math.abs(d)<1e-9) return p>=lo&&p<=hi ? [-Infinity,Infinity] : null; let t0=(lo-p)/d, t1=(hi-p)/d; if(t0>t1)[t0,t1]=[t1,t0]; return [t0,t1] }
  const tx=clip(x1,dx,left,right), ty=clip(y1,dy,top,bottom)
  if(!tx || !ty) return false
  const lo=Math.max(tx[0],ty[0],0), hi=Math.min(tx[1],ty[1],1)
  return lo<=hi
}
const zoneCoverage = computed(() => {
  const points=new Set<string>(), routes=new Set<string>()
  const zones=draft.value?.zones ?? []
  if(!zones.length) return { points, routes }
  for(const point of draft.value?.points ?? []){
    if(zones.some(zone=>isPointInZone(point.x,point.y,zone))) points.add(point.id)
  }
  for(const route of draft.value?.routes ?? []){
    const a=pointById(route.startId), b=pointById(route.endId)
    if(!a||!b) continue
    if(zones.some(zone=>segmentIntersectsZone(a.x,a.y,b.x,b.y,zone))) routes.add(route.id)
  }
  return { points, routes }
})
function isCovered(kind:'point'|'route', id:string){ return kind==='point'?zoneCoverage.value.points.has(id):zoneCoverage.value.routes.has(id) }
function chooseTool(next:MapEditorTool) { tool.value=next; selected.value=null; pending.value={}; notice.value='' }
function handleShortcut(event:KeyboardEvent){
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){ event.preventDefault(); undo(); return }
  if(event.key==='Escape'&&tool.value!=='select')chooseTool('select')
}
function selectObject(kind:NonNullable<Selection>['kind'], id:string) { if(tool.value==='select') selected.value={kind,id} }
function canvasPoint(event:MouseEvent | PointerEvent | WheelEvent) {
  const svg=(event.currentTarget as Element).closest('svg') as SVGSVGElement
  const matrix=svg.getScreenCTM()
  if(!matrix) return {x:0,y:0}
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse())
  return {x:Math.round(point.x*10)/10,y:Math.round(point.y*10)/10}
}
function setZoom(next:number){ zoom.value=Math.min(400,Math.max(60,next)) }
function onWheel(event:WheelEvent){
  const svg=event.currentTarget as SVGSVGElement; const box=svg.getBoundingClientRect(); const before=canvasPoint(event)
  const ratioX=(event.clientX-box.left)/box.width; const ratioY=(event.clientY-box.top)/box.height
  const next=Math.min(400,Math.max(60,zoom.value*(event.deltaY<0?1.16:0.86)))
  const nextWidth=MAP_WIDTH/(next/100); const nextHeight=MAP_HEIGHT/(next/100)
  cameraCenter.value={x:before.x+(0.5-ratioX)*nextWidth,y:before.y+(0.5-ratioY)*nextHeight}; zoom.value=Math.round(next)
}
function startPan(event:PointerEvent){
  if(event.button!==0 || (event.target as Element).closest('[data-object]')) return
  if(tool.value==='zone'){ const p=canvasPoint(event); zoneDragging.value=true; pending.value={zoneDrag:{anchor:p,current:p}}; (event.currentTarget as SVGSVGElement).setPointerCapture?.(event.pointerId); return }
  if(tool.value!=='select') return
  panning.value=true; panMoved=false; panStart={clientX:event.clientX,clientY:event.clientY,centerX:cameraCenter.value.x,centerY:cameraCenter.value.y}
  ;(event.currentTarget as SVGSVGElement).setPointerCapture?.(event.pointerId)
}
function moveCanvas(event:PointerEvent){
  cursor.value=canvasPoint(event)
  if(zoneDragging.value && pending.value.zoneDrag){ pending.value.zoneDrag.current=canvasPoint(event); return }
  if(!panning.value)return
  const box=(event.currentTarget as SVGSVGElement).getBoundingClientRect(); const width=MAP_WIDTH/(zoom.value/100); const height=MAP_HEIGHT/(zoom.value/100)
  const dx=event.clientX-panStart.clientX; const dy=event.clientY-panStart.clientY
  if(Math.abs(dx)+Math.abs(dy)>3)panMoved=true
  cameraCenter.value={x:panStart.centerX-dx*width/box.width,y:panStart.centerY-dy*height/box.height}
}
function endPan(event:PointerEvent){
  if(zoneDragging.value){ zoneDragging.value=false; const d=pending.value.zoneDrag; if(d && draft.value){ const a=d.anchor, c=d.current; const w=Math.abs(a.x-c.x), h=Math.abs(a.y-c.y); if(w>5 && h>5){ pushHistory(); const zoneId=`ZONE-${String(draft.value.zones.length+1).padStart(2,'0')}`; draft.value.zones.push({id:zoneId,x:Math.min(a.x,c.x),y:Math.min(a.y,c.y),width:w,height:h,type:zoneType.value,speedLimit:zoneType.value.includes('限速')?zoneSpeedLimit.value:undefined}); dirty.value=true; notice.value='管制区已创建'; chooseTool('select'); nextTick(()=>selectObject('zone',zoneId)) } else { notice.value='区域太小，已取消' } } pending.value={}; (event.currentTarget as SVGSVGElement).releasePointerCapture?.(event.pointerId); return }
  panning.value=false; (event.currentTarget as SVGSVGElement).releasePointerCapture?.(event.pointerId)
}
function onCanvasClick(event:MouseEvent) {
  if (!draft.value || panMoved || (event.target as Element).closest('[data-object]')) return
  const p=canvasPoint(event); cursor.value=p
  if(tool.value==='point'){ pushHistory(); const id=`P-${String(draft.value.points.length+1).padStart(2,'0')}`; draft.value.points.push({id,name:id,alias:id,description:'',uid:String(Date.now()),ownerGraphName:mapId,x:p.x,y:p.y,yaw:0,selectable:true,relocatable:true,disabled:false,charged:false,dockable:false,parkable:false,preMeshPoseName:'',options:{narrow:{boolValue:false,kind:'boolValue'},disjoint:{boolValue:false,kind:'boolValue'},poseType:{stringValue:'NORMAL',kind:'stringValue'},parkable:{boolValue:false,kind:'boolValue'}},associationType:'none',deviceId:''}); dirty.value=true; chooseTool('select'); nextTick(()=>selectObject('point',id)) }
}
function routePoint(id:string) {
  if(tool.value!=='route') return
  if(!pending.value.startId) pending.value={startId:id}
  else if(pending.value.startId!==id) pending.value={...pending.value,endId:id}
}
function saveRoute() {
  if(!draft.value || !pending.value.startId || !pending.value.endId) return
  pushHistory()
  const id=`R-${String(draft.value.routes.length+1).padStart(3,'0')}`
  const source=pointById(pending.value.startId); const target=pointById(pending.value.endId)
  draft.value.routes.push({id,name:id,alias:id,description:'',ownerGraphName:mapId,startId:pending.value.startId,endId:pending.value.endId,sourceName:source?.name??pending.value.startId,targetName:target?.name??pending.value.endId,type:'STRAIGHT_LINE',positions:[],bidirectional:bidirectional.value,backwards:backwards.value,disabled:false,maxLinearVel:speed.value})
  pending.value={}; dirty.value=true; chooseTool('select'); nextTick(()=>selectObject('route',id))
}
function requestDelete(){ if(selected.value)deleteRequest.value={...selected.value} }
function confirmDelete(){
  if(!draft.value || !deleteRequest.value)return
  pushHistory()
  const {kind,id}=deleteRequest.value
  if(kind==='point'){
    draft.value.points=draft.value.points.filter(item=>item.id!==id)
    draft.value.routes=draft.value.routes.filter(item=>item.startId!==id&&item.endId!==id)
  } else if(kind==='route') draft.value.routes=draft.value.routes.filter(item=>item.id!==id)
  else draft.value.zones=draft.value.zones.filter(item=>item.id!==id)
  deleteRequest.value=null; selected.value=null; dirty.value=true; notice.value='对象已删除'
}
async function save(){ if(!draft.value)return; saving.value=true; await saveMapDraft(mapId,draft.value); saving.value=false; dirty.value=false; notice.value='草稿已保存' }
async function finishPublish(){ await publishMapDraft(mapId); publishConfirm.value=false; notice.value='地图已发布' }
async function publish(){
  if(dirty.value) await save()
  publishConfirm.value=true
}
onMounted(async()=>{ window.addEventListener('keydown',handleShortcut); const [data,catalog]=await Promise.all([getMapDraft(mapId),getResourceCatalog()]); draft.value=data; draft.value.points.forEach(point=>{ if(!['none','dock','charge','parking'].includes(point.associationType))point.associationType='none' }); mapInfo.value=catalog.maps.find(map=>map.id===mapId); deviceOptions.value=catalog.devices.map(device=>({id:device.id,label:device.label,type:device.type})) })
onUnmounted(()=>window.removeEventListener('keydown',handleShortcut))
</script>

<template>
  <section class="editor-page map-editor-workbench">
    <header class="editor-topbar"><div><button aria-label="返回地图管理" @click="router.push('/maps')">←</button><span>地图管理 / <strong>{{ mapId }} · {{ mapInfo?.name || '地图编辑器' }}</strong></span><em>{{ notice || `${draft?.version} 草稿 · ${dirty?'未保存':'已保存'}` }}</em></div><div><button class="editor-undo-button" :disabled="!history.length" title="撤销上一步（Ctrl / Cmd + Z）" @click="undo"><span>↶</span> 撤销</button><button class="primary" @click="save">{{ saving?'保存中…':'保存草稿' }}</button><button @click="publish">发布地图</button></div></header>
    <div class="map-editor-shell" :class="{ 'property-collapsed': propertyCollapsed }">
      <aside class="map-toolrail"><nav><button v-for="item in tools" :key="item.id" :class="{active:tool===item.id}" @click="chooseTool(item.id)"><svg viewBox="0 0 20 20" aria-hidden="true"><path v-if="item.id==='select'" d="M4 3l10 7-4.5 1.2L7 16z"/><path v-else-if="item.id==='point'" d="M10 3v14M3 10h14"/><path v-else-if="item.id==='route'" d="M4 15L9 5l7 9M4 15h3M14 14h3"/><path v-else d="M4 5h12v10H4z"/></svg><span>{{ item.label }}</span></button></nav><p v-if="tool!=='select'"><b>{{ toolLabel }}</b><span>{{ toolHint }}　按 Esc 取消</span></p><div class="map-zoom-tools"><button aria-label="缩小地图" @click="setZoom(zoom-20)">−</button><span>{{ zoom }}%</span><button aria-label="放大地图" @click="setZoom(zoom+20)">＋</button><button @click="setZoom(100)">适应</button></div></aside>
      <main class="map-editor-canvas">
        <div class="editor-stage">
          <svg v-if="draft" :viewBox="viewBox" :class="{'is-panning':panning, 'zone-drawing':zoneDragging}" @click="onCanvasClick" @wheel.prevent="onWheel" @pointerdown="startPan" @pointermove="moveCanvas" @pointerup="endPan" @pointercancel="endPan">
            <defs><pattern id="editorGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#c9d6de"/></pattern></defs><rect :width="MAP_WIDTH" :height="MAP_HEIGHT" fill="url(#editorGrid)"/><MapPointcloud class="editor-slam-map"/>
            <g class="editor-zones"><rect v-for="zone in draft.zones" :key="zone.id" data-object :x="zone.x" :y="zone.y" :width="zone.width" :height="zone.height" :class="{selected:selected?.id===zone.id}" @click.stop="selectObject('zone',zone.id)"/></g>
            <g class="editor-base-paths"><path v-for="path in draft.topologyPaths" :key="path" :d="path"/></g>
            <g class="editor-map-lines"><template v-for="line in draft.routes" :key="line.id"><line v-if="pointById(line.startId)&&pointById(line.endId)" data-object :x1="pointById(line.startId)?.x" :y1="pointById(line.startId)?.y" :x2="pointById(line.endId)?.x" :y2="pointById(line.endId)?.y" :class="{selected:selected?.id===line.id,disabled:line.disabled,covered:isCovered('route',line.id)}" @click.stop="selectObject('route',line.id)"/></template></g>
            <g class="editor-map-points"><g v-for="point in draft.points" :key="point.id" data-object :transform="`translate(${point.x} ${point.y}) scale(${selected?.id===point.id ? symbolScale * 1.35 : symbolScale})`" :class="[selected?.id===point.id?'selected':'', tool==='route'?'routeTarget':'', point.associationType!=='none'?`pt-${point.associationType}`:'', isCovered('point',point.id)?'covered':'']" @click.stop="tool==='route'?routePoint(point.id):selectObject('point',point.id)"><circle class="point-hit" r="9"/><path class="point-mark" d="M0-3.5L3.2 2.8L-3.2 2.8Z" :transform="`rotate(${pointYawDegrees(point)})`"/><text v-if="labelsVisible || selected?.id===point.id" x="6" y="-6">{{ point.id }}</text></g></g>
            <rect v-if="pending.zoneDrag" :x="Math.min(pending.zoneDrag.anchor.x,pending.zoneDrag.current.x)" :y="Math.min(pending.zoneDrag.anchor.y,pending.zoneDrag.current.y)" :width="Math.abs(pending.zoneDrag.anchor.x-pending.zoneDrag.current.x)" :height="Math.abs(pending.zoneDrag.anchor.y-pending.zoneDrag.current.y)" class="zone-preview-rect"/>
          </svg>
          <div class="map-canvas-legend"><span><i class="point point-none"></i>一般站点</span><span><i class="point point-dock"></i>设备站点</span><span><i class="point point-charge"></i>充电站点</span><span><i class="point point-parking"></i>停车站点</span><span><i class="route"></i>路线</span><span><i class="zone"></i>管制区域</span></div>
        </div>
      </main>
      <aside class="map-properties" @focusin="beginPropertyEdit"><header><span>{{ tool==='select'?'对象属性':toolLabel }}</span><button :title="propertyCollapsed?'展开属性栏':'折叠属性栏'" @click="propertyCollapsed=!propertyCollapsed">{{ propertyCollapsed?'‹':'›' }}</button></header>
        <div v-if="tool==='select' && !selectedObject" class="empty-inspector"><b>选择地图对象</b><span>点击站点、路线或管制区，在这里查看和修改属性。</span></div>
        <div v-else-if="tool==='select' && selectedPoint" class="point-property-panel">
          <section class="point-property-hero"><div><small>导航站点</small><strong>{{ selectedPoint.name }}</strong><span>{{ selectedAssociation?.label }} · {{ selectedPoint.ownerGraphName }}</span></div><label><input v-model="selectedPoint.disabled" type="checkbox" @change="markDirty"><i></i><span>{{ selectedPoint.disabled?'已禁用':'已启用' }}</span></label></section>
          <details open><summary>基本信息</summary><div class="point-property-grid"><label class="wide">站点名称<input v-model="selectedPoint.name" @input="markDirty"></label><label>别名<input v-model="selectedPoint.alias" @input="markDirty"></label><label class="wide">描述<textarea v-model="selectedPoint.description" rows="2" placeholder="可选，用于说明现场位置" @input="markDirty"></textarea></label></div></details>
          <details open><summary>位置与朝向</summary><div class="point-property-grid"><label>X 坐标（m）<input v-model.number="selectedPoint.x" type="number" step="0.0001" @input="markDirty"></label><label>Y 坐标（m）<input v-model.number="selectedPoint.y" type="number" step="0.0001" @input="markDirty"></label><label class="wide">朝向（°）<div class="angle-field"><input v-model.number="selectedPointYaw" type="number" step="1"><span>{{ selectedPointYaw }}°</span></div></label></div></details>
          <details open><summary>站点用途</summary><div class="point-property-grid association-flow"><label class="wide">用途<select :value="selectedPoint.associationType" @change="setAssociationType(($event.target as HTMLSelectElement).value as StationAssociationType)"><option v-for="item in associationTypes" :key="item.value" :value="item.value">{{ item.label }}</option></select></label><label v-if="selectedPoint.associationType!=='none'" class="wide">关联设备<select v-model="selectedPoint.deviceId" :disabled="!filteredDeviceOptions.length" @change="markDirty"><option value="">{{ filteredDeviceOptions.length?'请选择设备':'暂无可关联设备' }}</option><option v-for="device in filteredDeviceOptions" :key="device.id" :value="device.id">{{ device.id }} · {{ device.label }}</option></select></label><p class="point-binding-note">{{ selectedAssociation?.hint }}</p></div></details>
          <details><summary>高级属性</summary><div class="point-switch-list"><label><span><b>可选取</b><small>允许调度系统选择该站点</small></span><input v-model="selectedPoint.selectable" type="checkbox" @change="markDirty"></label><label><span><b>可重新定位</b><small>允许车辆在该站点重新定位</small></span><input v-model="selectedPoint.relocatable" type="checkbox" @change="markDirty"></label><label><span><b>狭窄点</b><small>用于狭窄通道的特殊导航</small></span><input v-model="selectedPoint.options.narrow.boolValue" type="checkbox" @change="markDirty"></label><label><span><b>分离点</b><small>用于特殊路网连接</small></span><input v-model="selectedPoint.options.disjoint.boolValue" type="checkbox" @change="markDirty"></label></div></details>
          <details><summary>系统信息</summary><div class="point-property-grid"><label class="wide">站点 UID<input :value="selectedPoint.uid" readonly></label><label class="wide">所属地图<input :value="selectedPoint.ownerGraphName" readonly></label><label class="wide">前置站点<input v-model="selectedPoint.preMeshPoseName" placeholder="未设置" @input="markDirty"></label><label class="wide">Pose Type<input :value="selectedPoint.options.poseType.stringValue" readonly></label></div></details>
          <section class="object-danger-zone"><span><b>删除站点</b><small>同时删除连接该站点的所有路线。</small></span><button type="button" @click="requestDelete">删除</button></section>
        </div>
        <div v-else-if="tool==='select' && selectedRoute" class="point-property-panel route-property-panel">
          <section class="point-property-hero"><div><small>直线路线</small><strong>{{ selectedRoute.name }}</strong><span>{{ selectedRoute.sourceName }} → {{ selectedRoute.targetName }}</span></div><label><input v-model="selectedRoute.disabled" type="checkbox" @change="markDirty"><i></i><span>{{ selectedRoute.disabled?'已禁用':'已启用' }}</span></label></section>
          <details open><summary>基本信息</summary><div class="point-property-grid"><label class="wide">路线名称<input v-model="selectedRoute.name" @input="markDirty"></label><label>别名<input v-model="selectedRoute.alias" @input="markDirty"></label><label class="wide">描述<textarea v-model="selectedRoute.description" rows="2" placeholder="可选，用于说明通行用途" @input="markDirty"></textarea></label></div></details>
          <details open><summary>连接站点</summary><div class="point-property-grid"><label class="wide">起点站<input :value="selectedRoute.sourceName" readonly></label><label class="wide">终点站<input :value="selectedRoute.targetName" readonly></label><label class="wide">规划类型<input value="STRAIGHT_LINE" readonly></label></div></details>
          <details open><summary>通行规则</summary><div class="point-switch-list"><label><span><b>双向通行</b><small>允许起点与终点之间双向导航</small></span><input v-model="selectedRoute.bidirectional" type="checkbox" @change="markDirty"></label><label><span><b>倒车行驶</b><small>车端 backwards</small></span><input v-model="selectedRoute.backwards" type="checkbox" @change="markDirty"></label></div><div class="point-property-grid"><label class="wide">最大线速度（m/s）<input v-model.number="selectedRoute.maxLinearVel" type="number" min="0" step="0.1" @input="markDirty"></label></div></details>
          <details><summary>系统信息</summary><div class="point-property-grid"><label class="wide">路线编号<input :value="selectedRoute.id" readonly></label><label class="wide">所属地图<input :value="selectedRoute.ownerGraphName" readonly></label></div></details>
          <section class="object-danger-zone"><span><b>删除路线</b><small>删除站点之间的当前连接。</small></span><button type="button" @click="requestDelete">删除</button></section>
        </div>
        <div v-else-if="tool==='select' && selectedZone" class="point-property-panel zone-property-panel">
          <section class="point-property-hero"><div><small>管制区域</small><strong>{{ selectedZone.id }}</strong><span>{{ selectedZoneType?.label ?? '管制区' }}</span></div></section>
          <details open><summary>位置与尺寸</summary><div class="point-property-grid"><label>X 坐标（m）<input v-model.number="selectedZone.x" type="number" step="0.1" @input="markDirty"></label><label>Y 坐标（m）<input v-model.number="selectedZone.y" type="number" step="0.1" @input="markDirty"></label><label>宽度（m）<input v-model.number="selectedZone.width" type="number" min="0.1" step="0.1" @input="markDirty"></label><label>高度（m）<input v-model.number="selectedZone.height" type="number" min="0.1" step="0.1" @input="markDirty"></label></div></details>
          <details open><summary>管制规则</summary><div class="point-property-grid association-flow"><label class="wide">管制类型<select v-model="selectedZone.type" @change="markDirty"><option v-for="item in zoneTypeOptions" :key="item.value" :value="item.value">{{ item.label }} · {{ item.hint }}</option></select></label><label v-if="isSpeedZone" class="wide">限速值（m/s）<input v-model.number="selectedZone.speedLimit" type="number" min="0.1" step="0.1" @input="markDirty"></label><p class="point-binding-note">{{ selectedZoneType?.hint }}{{ isSpeedZone && selectedZone.speedLimit?`　·　当前限速 ${selectedZone.speedLimit} m/s`:'' }}</p></div></details>
          <details><summary>系统信息</summary><div class="point-property-grid"><label class="wide">区域编号<input :value="selectedZone.id" readonly></label></div></details>
          <section class="object-danger-zone"><span><b>删除管制区</b><small>将删除当前管制区域。此操作无法撤销。</small></span><button type="button" class="danger" @click="requestDelete">删除</button></section>
        </div>
        <div v-else-if="tool==='select' && selectedObject" class="property-form"><label>对象编号<input :value="selectedObject.id" readonly></label><template v-for="(value,key) in selectedObject" :key="key"><label v-if="key!=='id'">{{ key }}<input :value="value" @input="dirty=true"></label></template><section class="object-danger-zone"><span><b>删除管制区</b><small>删除当前区域。</small></span><button type="button" @click="requestDelete">删除</button></section></div>
        <div v-else class="operation-panel">
          <p v-if="tool==='point'"><b>新增站点</b><span>点击可创建站点。</span></p>
          <template v-if="tool==='route'"><ol><li :class="{done:pending.startId}">1　选择起点 <b>{{ pending.startId }}</b></li><li :class="{done:pending.endId}">2　选择终点 <b>{{ pending.endId }}</b></li><li>3　设置规则</li></ol><label class="route-option"><span>双向通行</span><input v-model="bidirectional" type="checkbox"></label><label class="route-option"><span>倒车行驶</span><input v-model="backwards" type="checkbox"></label><label>最高速度<input v-model.number="speed" type="number" min="0" step="0.1"></label><button class="primary" :disabled="!pending.endId" @click="saveRoute">保存路线</button></template>
          <template v-if="tool==='zone'"><p><b>按住拖拽</b><span>在地图上拖拽绘制矩形管制区域。</span></p><label>管制类型<select v-model="zoneType"><option>互斥区 · 同时允许 1 台 AMR</option><option>限速区 · 限制通行速度</option><option>禁行区 · 不允许路线穿越</option></select></label><label v-if="zoneType.includes('限速')">限速值（m/s）<input v-model.number="zoneSpeedLimit" type="number" min="0.1" step="0.1"></label></template>
        </div>
      </aside>
    </div>
    <div v-if="publishConfirm" class="map-publish-dialog-backdrop" @click.self="publishConfirm=false">
      <section class="map-publish-dialog" role="dialog" aria-modal="true" aria-labelledby="map-publish-title">
        <header><div><small>发布确认</small><strong id="map-publish-title">确定要发布当前地图吗？</strong></div><button aria-label="关闭" @click="publishConfirm=false">×</button></header>
        <div><p>发布后地图将以最新草稿生效。请确认所有改动已保存完毕。</p><p class="map-publish-note warning">发布操作不可撤销，如需回退请基于已发布版本重新编辑。</p></div>
        <footer><button @click="publishConfirm=false">取消</button><button class="primary" @click="finishPublish">确认发布</button></footer>
      </section>
    </div>
    <div v-if="deleteRequest" class="map-publish-dialog-backdrop" @click.self="deleteRequest=null">
      <section class="map-publish-dialog map-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="map-delete-title">
        <header><div><small>危险操作</small><strong id="map-delete-title">{{ deleteTitle }}</strong></div><button aria-label="关闭" @click="deleteRequest=null">×</button></header>
        <div><p>{{ deleteDescription }}</p></div>
        <footer><button @click="deleteRequest=null">取消</button><button class="danger" @click="confirmDelete">确认删除</button></footer>
      </section>
    </div>
  </section>
</template>
