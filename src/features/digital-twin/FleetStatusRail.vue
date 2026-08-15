<script setup lang="ts">
import { computed } from 'vue'
import type { TwinSnapshot } from '../../types/domain'

const props = defineProps<{ snapshot: TwinSnapshot }>()
const emit = defineEmits<{ filter: [value: 'all' | 'running' | 'waiting' | 'abnormal'] }>()

const counts = computed(() => ({
  total: props.snapshot.amrs.length,
  running: props.snapshot.amrs.filter((amr) => amr.status === '执行中').length,
  idle: props.snapshot.amrs.filter((amr) => amr.status === '空闲').length,
  waiting: props.snapshot.amrs.filter((amr) => amr.status === '等待').length,
  charging: props.snapshot.amrs.filter((amr) => amr.status === '充电').length,
  fault: props.snapshot.amrs.filter((amr) => amr.status === '故障').length,
}))
</script>

<template>
  <section class="fleet-rail" aria-label="全局运行状态">
    <button class="fleet-rail__primary" type="button" @click="emit('filter', 'all')">
      <span>AMR 总数</span><strong>{{ counts.total }}</strong><small>在线 {{ counts.total }}</small>
    </button>
    <span class="rail-divider"></span>
    <button type="button" @click="emit('filter', 'running')"><i class="status-dot running"></i><span>执行</span><strong>{{ counts.running }}</strong></button>
    <button type="button" @click="emit('filter', 'all')"><i class="status-dot idle"></i><span>空闲</span><strong>{{ counts.idle }}</strong></button>
    <button type="button" @click="emit('filter', 'waiting')"><i class="status-dot waiting"></i><span>等待</span><strong>{{ counts.waiting }}</strong></button>
    <button type="button" @click="emit('filter', 'all')"><i class="status-dot charging"></i><span>充电</span><strong>{{ counts.charging }}</strong></button>
    <button class="danger-item" type="button" @click="emit('filter', 'abnormal')"><i class="status-dot fault"></i><span>故障</span><strong>{{ counts.fault }}</strong></button>
    <div class="fleet-rail__scope">
      <span>运行范围</span>
      <button type="button">2F · 装配物流区 <b>⌄</b></button>
    </div>
  </section>
</template>
