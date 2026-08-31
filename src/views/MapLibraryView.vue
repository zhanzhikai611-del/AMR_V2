<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getResourceCatalog } from '../api/modules/resources'
import type { MapDefinition } from '../types/domain'
import pointcloudMap from '../assets/cnc-pointcloud-map.png'

const maps = ref<MapDefinition[]>([])
const query = ref('')
const status = ref('全部状态')
const source = ref('全部上传车辆')
const runtimeTarget = ref<MapDefinition | null>(null)
const showCreate = ref(false)
const router = useRouter()

const filteredMaps = computed(() => maps.value.filter((map) => {
  const keyword = query.value.trim().toLowerCase()
  const matchesQuery = !keyword || [map.id,map.mapVersion,map.uploadVehicle,map.updatedAt].some(value => value?.toLowerCase().includes(keyword))
  const matchesStatus = status.value === '全部状态' || map.status === status.value
  return matchesQuery && matchesStatus && (source.value === '全部上传车辆' || source.value === map.uploadVehicle)
}))
const currentMap = computed(() => maps.value.find(map=>map.current) ?? null)

onMounted(async () => { maps.value = (await getResourceCatalog()).maps })
function openEditor(map: MapDefinition) { router.push(`/maps/${map.id}/edit`) }
function requestSetCurrent(map:MapDefinition){ if(map.status==='已发布'&&!map.current)runtimeTarget.value=map }
function setCurrentMap(){ if(!runtimeTarget.value)return; maps.value.forEach(map=>{ map.current=map.id===runtimeTarget.value?.id }); runtimeTarget.value=null }
</script>

<template>
  <section class="resource-page map-library-page">
    <header class="resource-page__header">
      <div><p class="page-eyebrow">MAP VERSIONS</p><h1>地图管理</h1></div>
      <button class="resource-primary-action" @click="showCreate=true">＋ 导入地图版本</button>
    </header>
    <div class="resource-toolbar">
      <label><span>⌕</span><input v-model="query" placeholder="搜索版本、上传车辆或时间"></label>
      <div>
        <select v-model="status"><option>全部状态</option><option>已发布</option><option>草稿</option><option>空白</option></select>
        <select v-model="source"><option>全部上传车辆</option><option>AMR-02</option><option>AMR-03</option><option>AMR-06</option></select>
      </div>
    </div>
    <div class="map-library-grid">
      <article v-for="map in filteredMaps" :key="map.id" class="map-library-card" :class="{'is-current':map.current}" tabindex="0" @click="openEditor(map)" @keydown.enter="openEditor(map)">
        <div class="map-card-preview" :class="{ 'is-empty': map.status === '空白' }">
          <img v-if="map.status !== '空白'" :src="pointcloudMap" alt="地图点云缩略图">
          <svg v-if="map.status !== '空白'" viewBox="0 0 360 210" aria-hidden="true" class="map-card-network"><path d="M74 54V176M116 54V176M158 54V176M200 54V176M242 54V176M284 54V176M58 112H300M58 176H300"/><path d="M74 84l42 38M116 84L74 122M158 84l42 38M200 84l-42 38M242 84l42 38M284 84l-42 38"/></svg>
          <span :class="`map-card-status is-${map.status}`">{{ map.status }}</span>
          <b class="map-card-open">打开地图编辑器 ↗</b>
        </div>
        <div class="map-card-body">
          <div class="map-card-title">
            <span><h2>{{ map.mapVersion }} · {{ map.name }}</h2><small>{{ map.id }} · {{ map.owner }} · {{ map.updatedAt }}</small></span>
            <span v-if="map.current" class="map-current-label"><i></i>当前地图</span>
            <button v-else class="map-runtime-action" :disabled="map.status!=='已发布'" :title="map.status!=='已发布'?'地图发布后才能设为当前运行地图':''" @click.stop="requestSetCurrent(map)">{{ map.status==='已发布'?'设置为当前地图':'未发布' }}</button>
          </div>
          <dl>
            <div><dt>上传来源</dt><dd>{{ map.source }}</dd></div><div><dt>逻辑对象</dt><dd>{{ map.objectSummary }}</dd></div>
          </dl>
        </div>
      </article>
    </div>

    <div v-if="runtimeTarget" class="modal-backdrop" @click.self="runtimeTarget=null"><section class="runtime-map-dialog runtime-map-confirm"><header><div><small>全局运行地图</small><strong>设为当前运行地图？</strong></div><button @click="runtimeTarget=null">×</button></header><div><p>全局系统将从 <b>{{ currentMap?.mapVersion }}</b> 切换为 <b>{{ runtimeTarget.mapVersion }} · {{ runtimeTarget.name }}</b>。</p><small>当前原型只更新运行地图标记，正式版本仍需按发布与异步下发规则执行。</small></div><footer><button @click="runtimeTarget=null">取消</button><button class="primary" @click="setCurrentMap">确认切换</button></footer></section></div>
    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate=false"><section class="create-dialog"><header><div><span>IMPORT MAP VERSION</span><strong>导入地图版本</strong></div><button @click="showCreate=false">×</button></header><label>地图版本<input placeholder="例如：V2.0"></label><label>地图来源<select><option>选择车辆上传记录</option><option>AMR-03 · 今日 14:36</option><option>AMR-06 · 今日 13:52</option><option>本地文件导入</option></select></label><footer><button @click="showCreate=false">取消</button><button class="primary" @click="showCreate=false">导入为草稿</button></footer></section></div>
  </section>
</template>
