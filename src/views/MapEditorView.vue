<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMapDraft, publishMapDraft, saveMapDraft, validateMapDraft } from '../api/modules/maps'
import { getResourceCatalog } from '../api/modules/resources'
import type { MapDefinition, MapEditorDraft, MapEditorTool, MapPoint } from '../types/domain'
import pointcloudMap from '../assets/cnc-pointcloud-map.png'

type Selection = { kind:'point'|'route'|'resource'|'zone'; id:string } | null
const MAP_WIDTH = 760
const MAP_HEIGHT = 520
const route = useRoute(); const router = useRouter(); const mapId = String(route.params.id)
const draft = ref<MapEditorDraft>(); const mapInfo = ref<MapDefinition>(); const tool = ref<MapEditorTool>('select')
const zoom = ref(100); const selected = ref<Selection>(null); const dirty = ref(false); const saving = ref(false); const notice = ref(''); const cursor = ref({x:0,y:0})
const cameraCenter = ref({x:MAP_WIDTH/2,y:MAP_HEIGHT/2}); const panning = ref(false); const searchQuery = ref('')
let panStart = {clientX:0,clientY:0,centerX:0,centerY:0}; let panMoved = false
const propertyCollapsed = ref(false)
const cncDeviceIds = ref<string[]>([])
const pending = ref<{first?: {x:number;y:number}; startId?:string; endId?:string}>({})
const direction = ref('双向通行'); const speed = ref(1.2); const pointType = ref<'路网节点'>('路网节点'); const resourceId = ref('CNC-07'); const approach = ref('0° · 向东'); const zoneType = ref('互斥区 · 同时允许 1 台 AMR')
const tools: Array<{id:MapEditorTool;icon:string;label:string}> = [{id:'select',icon:'↖',label:'选择'},{id:'point',icon:'●',label:'新建路网点'},{id:'resource',icon:'▣',label:'放置资源'},{id:'route',icon:'╱',label:'创建路线'},{id:'zone',icon:'□',label:'绘制管制区'},{id:'delete',icon:'⌫',label:'删除所选'}]
const toolLabel = computed(() => tools.find(item=>item.id===tool.value)?.label ?? '')
const viewBox = computed(() => {
  const width=MAP_WIDTH/(zoom.value/100); const height=MAP_HEIGHT/(zoom.value/100)
  return `${cameraCenter.value.x-width/2} ${cameraCenter.value.y-height/2} ${width} ${height}`
})
const labelsVisible = computed(() => zoom.value >= 170)
const symbolScale = computed(() => Math.min(1.15, 100/zoom.value))
const selectedObject = computed(() => {
  if (!draft.value || !selected.value) return null
  const pools = { point:draft.value.points, route:draft.value.routes, resource:draft.value.resources, zone:draft.value.zones }
  return pools[selected.value.kind].find(item => item.id === selected.value?.id) ?? null
})
const selectedPoint = computed(() => selected.value?.kind === 'point' ? selectedObject.value as MapPoint : null)
const selectedPointYaw = computed({
  get: () => Math.round(((selectedPoint.value?.yaw ?? 0) * 180 / Math.PI) * 10) / 10,
  set: (degrees:number) => { if(selectedPoint.value){ selectedPoint.value.yaw=degrees*Math.PI/180; dirty.value=true } },
})
function markDirty(){ dirty.value=true }
function toggleServiceAction(action:'LOAD'|'UNLOAD'){
  if(!selectedPoint.value)return
  const actions=selectedPoint.value.serviceActions
  selectedPoint.value.serviceActions=actions.includes(action)?actions.filter(item=>item!==action):[...actions,action]
  markDirty()
}
function pointById(id:string) { return draft.value?.points.find(point=>point.id===id) }
function pointYawDegrees(point:MapPoint){ return point.yaw*180/Math.PI }
function chooseTool(next:MapEditorTool) { if(next==='delete'){ deleteSelected(); return }; tool.value=next; selected.value=null; pending.value={}; notice.value='' }
function selectObject(kind:NonNullable<Selection>['kind'], id:string) { if(tool.value==='select') selected.value={kind,id} }
function canvasPoint(event:MouseEvent | PointerEvent | WheelEvent) {
  const svg=(event.currentTarget as Element).closest('svg') as SVGSVGElement
  const matrix=svg.getScreenCTM()
  if(!matrix) return {x:0,y:0}
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse())
  return {x:Math.round(point.x*10)/10,y:Math.round(point.y*10)/10}
}
function setZoom(next:number){ zoom.value=Math.min(400,Math.max(60,next)) }
function fitMap(){ zoom.value=100; cameraCenter.value={x:MAP_WIDTH/2,y:MAP_HEIGHT/2} }
function onWheel(event:WheelEvent){
  const svg=event.currentTarget as SVGSVGElement; const box=svg.getBoundingClientRect(); const before=canvasPoint(event)
  const ratioX=(event.clientX-box.left)/box.width; const ratioY=(event.clientY-box.top)/box.height
  const next=Math.min(400,Math.max(60,zoom.value*(event.deltaY<0?1.16:0.86)))
  const nextWidth=MAP_WIDTH/(next/100); const nextHeight=MAP_HEIGHT/(next/100)
  cameraCenter.value={x:before.x+(0.5-ratioX)*nextWidth,y:before.y+(0.5-ratioY)*nextHeight}; zoom.value=Math.round(next)
}
function startPan(event:PointerEvent){
  if(event.button!==0 || tool.value!=='select' || (event.target as Element).closest('[data-object]')) return
  panning.value=true; panMoved=false; panStart={clientX:event.clientX,clientY:event.clientY,centerX:cameraCenter.value.x,centerY:cameraCenter.value.y}
  ;(event.currentTarget as SVGSVGElement).setPointerCapture?.(event.pointerId)
}
function moveCanvas(event:PointerEvent){
  cursor.value=canvasPoint(event)
  if(!panning.value)return
  const box=(event.currentTarget as SVGSVGElement).getBoundingClientRect(); const width=MAP_WIDTH/(zoom.value/100); const height=MAP_HEIGHT/(zoom.value/100)
  const dx=event.clientX-panStart.clientX; const dy=event.clientY-panStart.clientY
  if(Math.abs(dx)+Math.abs(dy)>3)panMoved=true
  cameraCenter.value={x:panStart.centerX-dx*width/box.width,y:panStart.centerY-dy*height/box.height}
}
function endPan(event:PointerEvent){ panning.value=false; (event.currentTarget as SVGSVGElement).releasePointerCapture?.(event.pointerId) }
function locateObject(){
  if(!draft.value)return
  const keyword=searchQuery.value.trim().toLowerCase(); if(!keyword)return
  const point=draft.value.points.find(item=>[item.id,item.name,item.alias,item.deviceId].some(value=>value?.toLowerCase().includes(keyword)))
  const resource=draft.value.resources.find(item=>item.id.toLowerCase().includes(keyword))
  const routeItem=draft.value.routes.find(item=>item.id.toLowerCase().includes(keyword))
  const target=point??resource
  if(target){ selected.value={kind:point?'point':'resource',id:target.id}; cameraCenter.value={x:target.x,y:target.y}; setZoom(Math.max(zoom.value,180)); notice.value=`已定位 ${target.id}`; return }
  if(routeItem){ const a=pointById(routeItem.startId); const b=pointById(routeItem.endId); selected.value={kind:'route',id:routeItem.id}; if(a&&b)cameraCenter.value={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; setZoom(Math.max(zoom.value,160)); notice.value=`已定位 ${routeItem.id}`; return }
  notice.value=`未找到“${searchQuery.value.trim()}”`
}
function onCanvasClick(event:MouseEvent) {
  if (!draft.value || panMoved || (event.target as Element).closest('[data-object]')) return
  const p=canvasPoint(event); cursor.value=p
  if(tool.value==='point'){ const id=`P-${String(draft.value.points.length+1).padStart(2,'0')}`; draft.value.points.push({id,name:id,alias:id,description:'',uid:String(Date.now()),ownerGraphName:mapId,x:p.x,y:p.y,yaw:0,type:pointType.value,poseType:'NORMAL',selectable:true,relocatable:true,disabled:false,narrow:false,disjoint:false,charged:false,dockable:false,parkable:false,deviceId:'',relationType:'无关联',serviceActions:[]}); dirty.value=true }
  if(tool.value==='resource'){ draft.value.resources.push({id:resourceId.value,resourceType:'CNC',pointId:'未绑定',x:p.x,y:p.y,approach:approach.value}); dirty.value=true; tool.value='select' }
  if(tool.value==='zone'){ if(!pending.value.first) pending.value={first:p}; else { const a=pending.value.first; draft.value.zones.push({id:`ZONE-${String(draft.value.zones.length+1).padStart(2,'0')}`,x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),width:Math.abs(a.x-p.x),height:Math.abs(a.y-p.y),type:zoneType.value}); pending.value={}; dirty.value=true; tool.value='select' } }
}
function routePoint(id:string) {
  if(tool.value!=='route') return
  if(!pending.value.startId) pending.value={startId:id}
  else if(pending.value.startId!==id) pending.value={...pending.value,endId:id}
}
function saveRoute() { if(!draft.value || !pending.value.startId || !pending.value.endId) return; draft.value.routes.push({id:`R-${String(draft.value.routes.length+1).padStart(2,'0')}`,startId:pending.value.startId,endId:pending.value.endId,direction:direction.value,speed:speed.value}); pending.value={}; dirty.value=true; tool.value='select' }
function deleteSelected(){ if(!draft.value || !selected.value){notice.value='请先选择要删除的对象';return}; const key={point:'points',route:'routes',resource:'resources',zone:'zones'}[selected.value.kind] as 'points'|'routes'|'resources'|'zones'; (draft.value[key] as Array<{id:string}>).splice((draft.value[key] as Array<{id:string}>).findIndex(i=>i.id===selected.value?.id),1); selected.value=null; dirty.value=true }
async function save(){ if(!draft.value)return; saving.value=true; await saveMapDraft(mapId,draft.value); saving.value=false; dirty.value=false; notice.value='草稿已保存' }
async function validate(){ const result=await validateMapDraft(mapId); notice.value=`校验完成：错误 ${result.errors}，待确认 ${result.warnings}` }
async function publish(){ if(dirty.value) await save(); await publishMapDraft(mapId); notice.value='地图已发布' }
onMounted(async()=>{ const [data,catalog]=await Promise.all([getMapDraft(mapId),getResourceCatalog()]); draft.value=data; mapInfo.value=catalog.maps.find(map=>map.id===mapId); cncDeviceIds.value=catalog.devices.filter(device=>device.type==='machine').map(device=>device.id) })
</script>

<template>
  <section class="editor-page map-editor-workbench">
    <header class="editor-topbar"><div><button aria-label="返回地图管理" @click="router.push('/maps')">←</button><span>地图管理 / <strong>{{ mapId }} · {{ mapInfo?.name || '地图编辑器' }}</strong></span><em>{{ notice || `${draft?.version} 草稿 · ${dirty?'未保存':'已保存'}` }}</em></div><div><button class="primary" @click="save">{{ saving?'保存中…':'保存草稿' }}</button><button @click="validate">校验地图</button><button @click="publish">发布地图</button></div></header>
    <div class="map-editor-shell" :class="{ 'property-collapsed': propertyCollapsed }">
      <aside class="map-toolrail"><template v-for="(item,index) in tools" :key="item.id"><i v-if="index===1 || index===5"></i><button :class="{active:tool===item.id,danger:item.id==='delete'}" :title="item.label" @click="chooseTool(item.id)"><b>{{ item.icon }}</b><span>{{ item.label }}</span></button></template></aside>
      <main class="map-editor-canvas">
        <header><span>当前工具 <strong>{{ toolLabel }}</strong></span><label class="map-editor-search"><span>⌕</span><input v-model="searchQuery" placeholder="点位 / 路线 / CNC" @keydown.enter="locateObject"><button @click="locateObject">定位</button></label><div><button @click="setZoom(zoom-15)">−</button><span>{{ zoom }}%</span><button @click="setZoom(zoom+15)">＋</button><button @click="fitMap">适应</button></div></header>
        <div class="editor-stage">
          <svg v-if="draft" :viewBox="viewBox" :class="{'is-panning':panning}" @click="onCanvasClick" @wheel.prevent="onWheel" @pointerdown="startPan" @pointermove="moveCanvas" @pointerup="endPan" @pointercancel="endPan">
            <defs><pattern id="editorGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#cfdbe2"/></pattern></defs><rect width="760" height="520" fill="url(#editorGrid)"/>
            <image :href="pointcloudMap" x="20" y="52" width="720" height="405" preserveAspectRatio="none" class="editor-slam-map"/>
            <g class="editor-zones"><rect v-for="zone in draft.zones" :key="zone.id" data-object :x="zone.x" :y="zone.y" :width="zone.width" :height="zone.height" :class="{selected:selected?.id===zone.id}" @click.stop="selectObject('zone',zone.id)"/></g>
            <g class="editor-base-paths"><path v-for="path in draft.topologyPaths" :key="path" :d="path"/></g>
            <g class="editor-map-lines"><line v-for="line in draft.routes" :key="line.id" data-object :x1="pointById(line.startId)?.x" :y1="pointById(line.startId)?.y" :x2="pointById(line.endId)?.x" :y2="pointById(line.endId)?.y" :class="{selected:selected?.id===line.id}" @click.stop="selectObject('route',line.id)"/></g>
            <g class="editor-map-points"><g v-for="point in draft.points" :key="point.id" data-object :transform="`translate(${point.x} ${point.y}) scale(${symbolScale})`" :class="[{selected:selected?.id===point.id,routeTarget:tool==='route'},point.type==='普通站点'?'service-point':'network-point']" @click.stop="tool==='route'?routePoint(point.id):selectObject('point',point.id)"><circle class="point-hit" r="9"/><circle v-if="point.type==='路网节点' && (tool==='route' || selected?.id===point.id)" class="network-point-mark" r="2.2"/><path v-else-if="point.type==='普通站点'" class="point-mark" d="M0-3.5L3.2 2.8L-3.2 2.8Z" :transform="`rotate(${pointYawDegrees(point)})`"/><text v-if="labelsVisible || selected?.id===point.id" x="6" y="-6">{{ point.id }}</text></g></g>
            <g class="editor-resources"><g v-for="resource in draft.resources" :key="resource.id" data-object :transform="`translate(${resource.x} ${resource.y}) scale(${symbolScale})`" :class="[{selected:selected?.id===resource.id},resource.resourceType.toLowerCase()]" @click.stop="selectObject('resource',resource.id)"><circle class="resource-mark" r="3.6"/><path d="M0 0V-8"/><rect x="-23" y="-27" width="46" height="18" rx="4"/><text y="-15">{{ resource.id }}</text></g></g>
            <circle v-if="pending.first" :cx="pending.first.x" :cy="pending.first.y" r="7" class="pending-point"/>
          </svg>
          <div class="map-canvas-legend"><span><i class="scan"></i>SLAM 底图</span><span><i class="point"></i>导航点位</span><span><i class="route"></i>导航路线</span><span><i class="zone"></i>管制区域</span></div>
        </div>
      </main>
      <aside class="map-properties"><header><span>{{ tool==='select'?'对象属性':toolLabel }}</span><button :title="propertyCollapsed?'展开属性栏':'折叠属性栏'" @click="propertyCollapsed=!propertyCollapsed">{{ propertyCollapsed?'‹':'›' }}</button></header>
        <div v-if="tool==='select' && !selectedObject" class="empty-inspector"><b>未选择对象</b><span>点击地图中的点位、路线、资源或管制区查看属性。</span></div>
        <div v-else-if="tool==='select' && selectedPoint" class="point-property-panel">
          <section class="point-property-hero"><div><small>POINT</small><strong>{{ selectedPoint.name }}</strong><span>{{ selectedPoint.type }} · {{ selectedPoint.ownerGraphName }}</span></div><label><input v-model="selectedPoint.disabled" type="checkbox" @change="markDirty"><i></i><span>{{ selectedPoint.disabled?'已禁用':'已启用' }}</span></label></section>
          <details open><summary>基本信息</summary><div class="point-property-grid"><label class="wide">点位名称<input v-model="selectedPoint.name" @input="markDirty"></label><label>别名<input v-model="selectedPoint.alias" @input="markDirty"></label><label>点位类型<select v-model="selectedPoint.type" @change="markDirty"><option>路网节点</option><option>普通站点</option></select></label><label class="wide">描述<textarea v-model="selectedPoint.description" rows="2" placeholder="可选，用于说明现场位置" @input="markDirty"></textarea></label></div></details>
          <details open><summary>位置与朝向</summary><div class="point-property-grid"><label>X 坐标（m）<input v-model.number="selectedPoint.x" type="number" step="0.0001" @input="markDirty"></label><label>Y 坐标（m）<input v-model.number="selectedPoint.y" type="number" step="0.0001" @input="markDirty"></label><label class="wide">朝向（°）<div class="angle-field"><input v-model.number="selectedPointYaw" type="number" step="1"><span>{{ selectedPointYaw }}°</span></div></label></div></details>
          <details open><summary>关联 CNC</summary><div class="point-property-grid"><label class="wide">关联设备<select v-model="selectedPoint.deviceId" @change="markDirty"><option value="">不关联设备</option><option v-for="id in cncDeviceIds" :key="id" :value="id">{{ id }}</option></select></label><label class="wide">点位用途<select v-model="selectedPoint.relationType" :disabled="!selectedPoint.deviceId" @change="markDirty"><option>无关联</option><option>上料位</option><option>下料位</option><option>上下料位</option></select></label><fieldset class="wide" :disabled="!selectedPoint.deviceId"><legend>允许动作</legend><button type="button" :class="{active:selectedPoint.serviceActions.includes('LOAD')}" @click="toggleServiceAction('LOAD')">上料</button><button type="button" :class="{active:selectedPoint.serviceActions.includes('UNLOAD')}" @click="toggleServiceAction('UNLOAD')">下料</button></fieldset><p v-if="selectedPoint.deviceId" class="point-binding-note">任务由 {{ selectedPoint.deviceId }} 发起后，调度车辆到达 {{ selectedPoint.name }}。</p></div></details>
          <details><summary>通行与能力</summary><div class="point-switch-list"><label><span><b>可选取</b><small>允许任务选择此点</small></span><input v-model="selectedPoint.selectable" type="checkbox" @change="markDirty"></label><label><span><b>可重新定位</b><small>允许作为定位参考点</small></span><input v-model="selectedPoint.relocatable" type="checkbox" @change="markDirty"></label><label><span><b>狭窄点</b><small>进入时启用狭窄区域规则</small></span><input v-model="selectedPoint.narrow" type="checkbox" @change="markDirty"></label><label><span><b>分离点</b><small>与相邻路网独立处理</small></span><input v-model="selectedPoint.disjoint" type="checkbox" @change="markDirty"></label><label><span><b>充电 / 对接 / 停车</b><small>站点可用能力</small></span><span class="capability-checks"><i><input v-model="selectedPoint.charged" type="checkbox" @change="markDirty">充电</i><i><input v-model="selectedPoint.dockable" type="checkbox" @change="markDirty">对接</i><i><input v-model="selectedPoint.parkable" type="checkbox" @change="markDirty">停车</i></span></label></div></details>
          <details><summary>系统信息</summary><div class="point-property-grid"><label class="wide">点位 UID<input :value="selectedPoint.uid" readonly></label><label class="wide">所属地图<input :value="selectedPoint.ownerGraphName" readonly></label><label class="wide">Pose Type<input :value="selectedPoint.poseType" readonly></label></div></details>
        </div>
        <div v-else-if="tool==='select' && selectedObject" class="property-form"><label>对象编号<input :value="selectedObject.id" readonly></label><template v-for="(value,key) in selectedObject" :key="key"><label v-if="key!=='id'">{{ key }}<input :value="value" @input="dirty=true"></label></template></div>
        <div v-else class="operation-panel">
          <p v-if="tool==='point'"><b>在地图上确定位置</b><span>点击通道中心创建路网点。</span></p><label v-if="tool==='point'">点位用途<select v-model="pointType"><option>路网节点</option></select></label>
          <template v-if="tool==='route'"><ol><li :class="{done:pending.startId}">1　选择起点 <b>{{ pending.startId }}</b></li><li :class="{done:pending.endId}">2　选择终点 <b>{{ pending.endId }}</b></li><li>3　设置规则</li></ol><label>通行方向<select v-model="direction"><option>双向通行</option><option>仅起点 → 终点</option><option>仅终点 → 起点</option></select></label><label>最高速度<input v-model.number="speed" type="number" step="0.1"></label><button class="primary" :disabled="!pending.endId" @click="saveRoute">保存路线</button></template>
          <template v-if="tool==='resource'"><p><b>放置资源</b><span>点击 AMR 实际停靠位置，而不是设备机身中心。</span></p><label>待定位资源<select v-model="resourceId"><option>CNC-07</option><option>CNC-09</option><option>CNC-12</option></select></label><label>AMR 停靠方向<select v-model="approach"><option>0° · 向东</option><option>90° · 向北</option><option>180° · 向西</option><option>270° · 向南</option></select></label></template>
          <template v-if="tool==='zone'"><p><b>{{ pending.first?'选择第二个角点':'选择第一个角点' }}</b><span>通过两个角点确定矩形范围。</span></p><label>管制类型<select v-model="zoneType"><option>互斥区 · 同时允许 1 台 AMR</option><option>限速区 · 限制通行速度</option><option>禁行区 · 不允许路线穿越</option></select></label></template>
        </div>
      </aside>
    </div>
  </section>
</template>
