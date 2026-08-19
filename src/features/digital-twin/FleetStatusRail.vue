<script setup lang="ts">
import { computed } from 'vue'
import type { TwinSnapshot } from '../../types/domain'
import { useRuntimeScopeStore } from '../../stores/runtimeScope'

const props = defineProps<{ snapshot: TwinSnapshot }>()
const runtimeScope = useRuntimeScopeStore()

const counts = computed(() => ({
  total: props.snapshot.amrs.length,
  running: props.snapshot.amrs.filter((amr) => amr.status === '执行中').length,
  idle: props.snapshot.amrs.filter((amr) => amr.status === '空闲').length,
  waiting: props.snapshot.amrs.filter((amr) => amr.status === '等待').length,
  charging: props.snapshot.amrs.filter((amr) => amr.status === '充电').length,
  abnormal: props.snapshot.amrs.filter((amr) => amr.status === '故障').length,
}))
</script>

<template>
  <section class="fleet-rail" aria-label="AMR 全局运行状态">
    <div class="fleet-rail__primary">
      <span>AMR 总数</span><strong>{{ counts.total }}</strong><small>在线 {{ counts.total }}</small>
    </div>
    <span class="rail-divider"></span>
    <div><i class="status-dot running"></i><span>执行</span><strong>{{ counts.running }}</strong></div>
    <div><i class="status-dot idle"></i><span>空闲</span><strong>{{ counts.idle }}</strong></div>
    <div><i class="status-dot waiting"></i><span>等待</span><strong>{{ counts.waiting }}</strong></div>
    <div><i class="status-dot charging"></i><span>充电</span><strong>{{ counts.charging }}</strong></div>
    <div class="danger-item"><i class="status-dot fault"></i><span>异常</span><strong>{{ counts.abnormal }}</strong></div>
    <div class="fleet-rail__scope">
      <span>运行范围</span>
      <button type="button">{{ runtimeScope.current.label }} <b>⌄</b></button>
    </div>
  </section>
</template>
