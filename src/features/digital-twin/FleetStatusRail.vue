<script setup lang="ts">
import { computed } from 'vue'
import type { TwinSnapshot } from '../../types/domain'
import { useRuntimeScopeStore } from '../../stores/runtimeScope'

const props = defineProps<{ snapshot: TwinSnapshot }>()
const runtimeScope = useRuntimeScopeStore()
const onlineAmrs = computed(() => props.snapshot.amrs.filter((amr) => amr.connectionStatus !== 'offline'))
const runnableAmrs = computed(() => onlineAmrs.value.filter((amr) => amr.dispatchStatus !== 'paused' && amr.runnable !== false))

const counts = computed(() => ({
  total: props.snapshot.amrs.length,
  online: onlineAmrs.value.length,
  runnable: runnableAmrs.value.length,
  running: runnableAmrs.value.filter((amr) => amr.status === '执行中').length,
  idle: runnableAmrs.value.filter((amr) => amr.status === '空闲').length,
  waiting: runnableAmrs.value.filter((amr) => amr.status === '等待').length,
  charging: runnableAmrs.value.filter((amr) => amr.status === '充电').length,
  abnormal: runnableAmrs.value.filter((amr) => amr.status === '故障').length,
}))
</script>

<template>
  <section class="fleet-rail" aria-label="AMR 全局运行状态">
    <div class="fleet-rail__availability" aria-label="车队连接与调度能力">
      <div class="availability-metric online" title="已建立连接的 AMR / 当前范围 AMR 总数"><span>上线车辆</span><p><strong>{{ counts.online }}</strong><small>/ {{ counts.total }}</small></p></div>
      <div class="availability-metric runnable" title="已上线且当前未暂停接单，可计入运行状态统计"><span>可运行车辆</span><strong>{{ counts.runnable }}</strong></div>
    </div>
    <span class="rail-divider"></span>
    <div class="fleet-rail__operations" aria-label="可运行车辆状态分布">
      <div><i class="status-dot running"></i><span>执行</span><strong>{{ counts.running }}</strong></div>
      <div><i class="status-dot idle"></i><span>空闲</span><strong>{{ counts.idle }}</strong></div>
      <div><i class="status-dot waiting"></i><span>等待</span><strong>{{ counts.waiting }}</strong></div>
      <div><i class="status-dot charging"></i><span>充电</span><strong>{{ counts.charging }}</strong></div>
      <div class="danger-item"><i class="status-dot fault"></i><span>异常</span><strong>{{ counts.abnormal }}</strong></div>
    </div>
    <div class="fleet-rail__scope">
      <span>运行范围</span>
      <button type="button">{{ runtimeScope.current.label }} <b>⌄</b></button>
    </div>
  </section>
</template>
