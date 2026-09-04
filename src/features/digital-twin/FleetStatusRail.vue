<script setup lang="ts">
import { computed } from 'vue'
import type { TwinSnapshot } from '../../types/domain'
import { useRuntimeScopeStore } from '../../stores/runtimeScope'

const props = defineProps<{ snapshot: TwinSnapshot }>()
const runtimeScope = useRuntimeScopeStore()
const onlineAmrs = computed(() => props.snapshot.amrs.filter((amr) => amr.connectionStatus !== 'offline' && amr.status !== '离线'))

const counts = computed(() => ({
  online: onlineAmrs.value.length,
  offline: props.snapshot.amrs.length - onlineAmrs.value.length,
  running: onlineAmrs.value.filter((amr) => amr.status === '运行').length,
  idle: onlineAmrs.value.filter((amr) => amr.status === '空闲').length,
  abnormal: onlineAmrs.value.filter((amr) => amr.status === '异常').length,
  charging: onlineAmrs.value.filter((amr) => amr.status === '充电').length,
  disabled: onlineAmrs.value.filter((amr) => amr.status === '停用').length,
}))
</script>

<template>
  <section class="fleet-rail" aria-label="AMR 全局运行状态">
    <div class="fleet-rail__status-strip">
      <div class="fleet-rail__online-group" aria-label="在线 AMR 状态分布">
        <div class="fleet-rail__availability">
          <div class="availability-metric online" title="当前运行范围内已建立连接的 AMR">
            <svg class="online-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            <span>在线</span><strong>{{ counts.online }}</strong>
          </div>
        </div>
        <div class="fleet-rail__operations">
          <div><i class="status-dot running"></i><span>运行</span><strong>{{ counts.running }}</strong></div>
          <div><i class="status-dot idle"></i><span>空闲</span><strong>{{ counts.idle }}</strong></div>
          <div class="danger-item"><i class="status-dot fault"></i><span>异常</span><strong>{{ counts.abnormal }}</strong></div>
          <div><i class="status-dot charging"></i><span>充电</span><strong>{{ counts.charging }}</strong></div>
          <div><i class="status-dot disabled"></i><span>停用</span><strong>{{ counts.disabled }}</strong></div>
        </div>
      </div>
      <div class="offline-item" title="当前运行范围内未连接的 AMR 数量">
        <svg class="offline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71M3 3l18 18" /></svg>
        <span>离线</span><strong>{{ counts.offline }}</strong>
      </div>
    </div>
    <div class="fleet-rail__scope">
      <div class="scope-fixed" aria-label="当前区域">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2M8 14h2m4 0h2M9 21v-3h6v3" /></svg>
        <span><small>当前区域</small><strong>{{ runtimeScope.current.label }}</strong></span>
      </div>
    </div>
  </section>
</template>
