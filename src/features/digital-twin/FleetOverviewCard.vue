<script setup lang="ts">
import { computed } from 'vue'
import type { TwinSnapshot } from '../../types/domain'

const props = defineProps<{ snapshot: TwinSnapshot }>()

const counts = computed(() => ({
  running: props.snapshot.amrs.filter((amr) => amr.status === '执行中').length,
  idle: props.snapshot.amrs.filter((amr) => amr.status === '空闲').length,
  waiting: props.snapshot.amrs.filter((amr) => amr.status === '等待').length,
  charging: props.snapshot.amrs.filter((amr) => amr.status === '充电').length,
  fault: props.snapshot.amrs.filter((amr) => amr.status === '故障').length,
}))

const utilizationDash = computed(() => `${props.snapshot.fleetUtilization} 100`)
</script>

<template>
  <section class="fleet-overview-card" aria-label="AMR 运行概览">
    <header>
      <div><i></i><strong>AMR 运行概览</strong></div>
      <span>在线 <b>{{ snapshot.amrs.length }}</b> / {{ snapshot.amrs.length }}</span>
    </header>
    <div class="fleet-overview-card__body">
      <div class="utilization-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="utilization-ring__track" cx="60" cy="60" r="48" pathLength="100" />
          <circle class="utilization-ring__progress" cx="60" cy="60" r="48" pathLength="100" :stroke-dasharray="utilizationDash" />
        </svg>
        <span><strong>{{ snapshot.fleetUtilization }}%</strong><small>AMR 稼动率</small></span>
      </div>
      <div class="fleet-status-grid">
        <div><strong>{{ counts.running }}</strong><span><i class="status-dot running"></i>执行</span></div>
        <div><strong>{{ counts.idle }}</strong><span><i class="status-dot idle"></i>空闲</span></div>
        <div><strong>{{ counts.waiting }}</strong><span><i class="status-dot waiting"></i>等待</span></div>
        <div><strong>{{ counts.charging }}</strong><span><i class="status-dot charging"></i>充电</span></div>
        <div class="fault"><strong>{{ counts.fault }}</strong><span><i class="status-dot fault"></i>异常</span></div>
      </div>
    </div>
  </section>
</template>
