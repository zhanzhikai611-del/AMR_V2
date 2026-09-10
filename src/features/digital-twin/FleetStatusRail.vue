<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Amr, TwinSnapshot } from '../../types/domain'
import { useRuntimeScopeStore } from '../../stores/runtimeScope'

const props = defineProps<{ snapshot: TwinSnapshot }>()
const emit = defineEmits<{ selectAmr: [id: string] }>()
const runtimeScope = useRuntimeScopeStore()
type StatusKey = 'online' | 'running' | 'idle' | 'abnormal' | 'charging' | 'disabled' | 'offline'
const rail = ref<HTMLElement | null>(null)
const activeStatus = ref<StatusKey | null>(null)
const onlineAmrs = computed(() => props.snapshot.amrs.filter((amr) => amr.connectionStatus !== 'offline' && amr.status !== '离线'))
const meta: Record<StatusKey, { label: string; tone: string }> = { online:{label:'在线',tone:'online'},running:{label:'运行',tone:'running'},idle:{label:'空闲',tone:'idle'},abnormal:{label:'异常',tone:'fault'},charging:{label:'充电',tone:'charging'},disabled:{label:'停用',tone:'disabled'},offline:{label:'离线',tone:'offline'} }
const groups = computed<Record<StatusKey, Amr[]>>(() => ({ online:onlineAmrs.value,running:onlineAmrs.value.filter(a=>a.status==='运行'),idle:onlineAmrs.value.filter(a=>a.status==='空闲'),abnormal:onlineAmrs.value.filter(a=>a.status==='异常'),charging:onlineAmrs.value.filter(a=>a.status==='充电'),disabled:onlineAmrs.value.filter(a=>a.status==='停用'),offline:props.snapshot.amrs.filter(a=>a.connectionStatus==='offline'||a.status==='离线') }))
const counts = computed(() => Object.fromEntries(Object.entries(groups.value).map(([key,items])=>[key,items.length])) as Record<StatusKey,number>)
const activeItems = computed(() => activeStatus.value ? groups.value[activeStatus.value] : [])
function toggle(key: StatusKey){ activeStatus.value = activeStatus.value === key ? null : key }
function choose(amr: Amr){ activeStatus.value=null; emit('selectAmr',amr.id) }
function outside(e: PointerEvent){ if(rail.value&&!rail.value.contains(e.target as Node)) activeStatus.value=null }
function escape(e: KeyboardEvent){ if(e.key==='Escape') activeStatus.value=null }
onMounted(()=>{document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)})
onBeforeUnmount(()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)})
</script>

<template>
  <section ref="rail" class="fleet-rail" aria-label="AMR 全局运行状态">
    <div class="fleet-rail__status-strip">
      <div class="fleet-rail__online-group" aria-label="在线 AMR 状态分布">
        <div class="fleet-rail__availability">
          <button class="availability-metric online status-trigger" :class="{active:activeStatus==='online'}" :aria-expanded="activeStatus==='online'" @click="toggle('online')">
            <svg class="online-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            <span>在线</span><strong>{{ counts.online }}</strong>
          </button>
        </div>
        <div class="fleet-rail__operations">
          <button v-for="key in (['running','idle','abnormal','charging','disabled'] as StatusKey[])" :key="key" class="status-trigger" :class="{active:activeStatus===key,'danger-item':key==='abnormal'}" :aria-expanded="activeStatus===key" @click="toggle(key)"><i class="status-dot" :class="meta[key].tone"></i><span>{{ meta[key].label }}</span><strong>{{ counts[key] }}</strong></button>
        </div>
      </div>
      <button class="offline-item status-trigger" :class="{active:activeStatus==='offline'}" :aria-expanded="activeStatus==='offline'" @click="toggle('offline')">
        <svg class="offline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71M3 3l18 18" /></svg>
        <span>离线</span><strong>{{ counts.offline }}</strong>
      </button>
    </div>
    <Transition name="fleet-popover"><section v-if="activeStatus" class="fleet-status-popover"><header><div><i class="status-dot" :class="meta[activeStatus].tone"></i><strong>{{ meta[activeStatus].label }}车辆</strong></div><span>{{ activeItems.length }} 台</span></header><div class="fleet-status-list"><button v-for="amr in activeItems" :key="amr.id" @click="choose(amr)"><b>{{ amr.id.replace('AMR-','') }}</b><span><strong>{{ amr.name }}</strong><small>{{ amr.ip }} · {{ amr.status }}</small></span><i>›</i></button><p v-if="!activeItems.length">当前没有{{ meta[activeStatus].label }}车辆</p></div></section></Transition>
    <div class="fleet-rail__scope">
      <div class="scope-fixed" aria-label="当前区域">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2M8 14h2m4 0h2M9 21v-3h6v3" /></svg>
        <span><small>当前区域</small><strong>{{ runtimeScope.current.label }}</strong></span>
      </div>
    </div>
  </section>
</template>
