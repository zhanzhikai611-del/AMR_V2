<script setup lang="ts">
import { computed } from 'vue'
import type { TwinSnapshot } from '../../types/domain'
import { useRuntimeScopeStore } from '../../stores/runtimeScope'

const props = defineProps<{ snapshot: TwinSnapshot }>()
const runtimeScope = useRuntimeScopeStore()
const onlineAmrs = computed(() => props.snapshot.amrs.filter((amr) => amr.connectionStatus !== 'offline'))

const counts = computed(() => ({
  total: props.snapshot.amrs.length,
  online: onlineAmrs.value.length,
  running: props.snapshot.amrs.filter((amr) => amr.status === '运行').length,
  idle: props.snapshot.amrs.filter((amr) => amr.status === '空闲').length,
  abnormal: props.snapshot.amrs.filter((amr) => amr.status === '异常').length,
  charging: props.snapshot.amrs.filter((amr) => amr.status === '充电').length,
  disabled: props.snapshot.amrs.filter((amr) => amr.status === '停用').length,
}))
</script>

<template>
  <section class="fleet-rail" aria-label="AMR 全局运行状态">
    <div class="fleet-rail__availability" aria-label="车队上线情况">
      <div class="availability-metric online" title="已建立连接的 AMR / 当前范围 AMR 总数"><span>上线</span><p><strong>{{ counts.online }}</strong><small>/ {{ counts.total }}</small></p></div>
    </div>
    <div class="fleet-rail__operations" aria-label="AMR 状态分布">
      <div><i class="status-dot running"></i><span>运行</span><strong>{{ counts.running }}</strong></div>
      <div><i class="status-dot idle"></i><span>空闲</span><strong>{{ counts.idle }}</strong></div>
      <div class="danger-item"><i class="status-dot fault"></i><span>异常</span><strong>{{ counts.abnormal }}</strong></div>
      <div><i class="status-dot charging"></i><span>充电</span><strong>{{ counts.charging }}</strong></div>
      <div><i class="status-dot disabled"></i><span>停用</span><strong>{{ counts.disabled }}</strong></div>
    </div>
    <div class="fleet-rail__scope">
      <span>运行范围</span>
      <div class="scope-fixed" aria-label="当前运行范围"><span>{{ runtimeScope.current.label }}</span></div>
    </div>
  </section>
</template>
