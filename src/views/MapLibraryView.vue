<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getResourceCatalog } from '../api/modules/resources'
import type { MapDefinition } from '../types/domain'
import { useRuntimeScopeStore } from '../stores/runtimeScope'

const maps = ref<MapDefinition[]>([])
const query = ref('')
const status = ref('全部状态')
const source = ref('全部上传车辆')
const settingsMap = ref<MapDefinition | null>(null)
const showCreate = ref(false)
const router = useRouter()
const runtimeScope = useRuntimeScopeStore()

const filteredMaps = computed(() => maps.value.filter((map) => {
  const keyword = query.value.trim().toLowerCase()
  const matchesQuery = !keyword || [map.id,map.mapVersion,map.uploadVehicle,map.updatedAt].some(value => value?.toLowerCase().includes(keyword))
  const matchesStatus = status.value === '全部状态' || map.status === status.value
  return map.scopeId === runtimeScope.current.id && matchesQuery && matchesStatus && (source.value === '全部上传车辆' || source.value === map.uploadVehicle)
}))

onMounted(async () => { maps.value = (await getResourceCatalog()).maps })
function openEditor(map: MapDefinition) { router.push(`/maps/${map.id}/edit`) }
</script>

<template>
  <section class="resource-page map-library-page">
    <header class="resource-page__header">
      <div><p class="page-eyebrow">MAP VERSIONS</p><h1>地图管理</h1><p>当前运行范围　<strong>{{ runtimeScope.current.label }}</strong></p></div>
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
      <article v-for="(map,index) in filteredMaps" :key="map.id" class="map-library-card" tabindex="0" @click="openEditor(map)" @keydown.enter="openEditor(map)">
        <div class="map-card-preview" :class="{ 'is-empty': map.status === '空白' }">
          <svg viewBox="0 0 360 210" aria-hidden="true">
            <g v-if="map.status !== '空白'" :transform="index===1?'translate(10 0)':''">
              <path d="M52 42V178M116 42V178M180 42V178M244 42V178M308 42V178M34 108H326M34 178H326"/>
              <path v-if="index===0" d="M52 108L116 178M180 108L244 178"/>
              <circle v-for="x in [52,116,180,244,308]" :key="x" :cx="x" cy="108" r="4"/>
            </g>
          </svg>
          <span>{{ map.mapVersion }} / {{ map.uploadVehicle }}</span><em :class="map.status">{{ map.current ? '当前运行' : map.status }}</em>
          <b class="map-card-open">打开地图编辑器 ↗</b>
        </div>
        <div class="map-card-body">
          <div class="map-card-title"><span><h2>{{ map.mapVersion }} · {{ map.name }}</h2><small>{{ map.scopeLabel }}</small></span><button title="版本资料" @click.stop="settingsMap=map">•••</button></div>
          <dl>
            <div><dt>上传来源</dt><dd>{{ map.source }}</dd></div><div><dt>资源范围</dt><dd>{{ map.resourceSummary }}</dd></div><div><dt>逻辑对象</dt><dd>{{ map.objectSummary }}</dd></div>
          </dl>
          <footer><span>运行 <b>{{ map.runtimeVersion }}</b> · 草稿 <b>{{ map.editVersion }}</b></span><span>{{ map.owner }} · {{ map.updatedAt }}</span></footer>
        </div>
      </article>
    </div>

    <div v-if="settingsMap" class="modal-backdrop" @click.self="settingsMap=null">
      <section class="map-settings-dialog"><header><div><small>MAP VERSION</small><strong>{{ settingsMap.mapVersion }} · 版本资料</strong></div><button @click="settingsMap=null">×</button></header>
        <nav><button class="active">版本信息</button><button>扫描底图</button><button>差异比较</button><button>发布记录</button></nav>
        <div class="map-settings-body">
          <label>运行范围<input :value="settingsMap.scopeLabel" readonly></label><label>地图版本<input :value="settingsMap.mapVersion" readonly></label>
          <label class="wide">上传来源<input :value="settingsMap.source" readonly></label>
          <section class="wide"><span><b>扫描底图</b><small>{{ settingsMap.uploadVehicle }} · {{ settingsMap.updatedAt }}</small></span><button>查看底图</button></section>
          <section class="wide"><span><b>资源范围</b><small>{{ settingsMap.resourceSummary }}</small></span><button>编辑选择</button></section>
        </div><footer><button @click="settingsMap=null">取消</button><button class="primary" @click="settingsMap=null">保存修改</button></footer>
      </section>
    </div>
    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate=false"><section class="create-dialog"><header><div><span>IMPORT MAP VERSION</span><strong>导入地图版本</strong></div><button @click="showCreate=false">×</button></header><label>运行范围<input :value="runtimeScope.current.label" readonly></label><label>地图版本<input placeholder="例如：V2.0"></label><label>地图来源<select><option>选择车辆上传记录</option><option>AMR-03 · 今日 14:36</option><option>AMR-06 · 今日 13:52</option><option>本地文件导入</option></select></label><footer><button @click="showCreate=false">取消</button><button class="primary" @click="showCreate=false">导入为草稿</button></footer></section></div>
  </section>
</template>
