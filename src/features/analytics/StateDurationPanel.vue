<script setup lang="ts">
import type { StateDuration } from '../../types/analytics'

defineProps<{ items: StateDuration[] }>()

const labels = { running: '运行', idle: '空闲', charging: '充电', abnormal: '异常', disabled: '停用', offline: '离线' }

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`
}
</script>

<template>
  <div class="state-duration-panel">
    <div class="state-duration-track" aria-label="状态时长占比">
      <span v-for="item in items" :key="item.state" :class="item.state" :style="{ width: `${item.ratio}%` }" :title="`${labels[item.state]} ${item.ratio}%`"></span>
    </div>
    <ul>
      <li v-for="item in items" :key="item.state"><i :class="item.state"></i><span>{{ labels[item.state] }}</span><strong>{{ item.ratio }}%</strong><small class="type-data">{{ formatMinutes(item.minutes) }}</small></li>
    </ul>
  </div>
</template>
