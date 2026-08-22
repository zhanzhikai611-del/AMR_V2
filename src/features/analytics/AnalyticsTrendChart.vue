<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsTrendPoint } from '../../types/analytics'

const props = defineProps<{ points: AnalyticsTrendPoint[] }>()
const chart = { left: 46, right: 18, top: 18, bottom: 34, width: 760, height: 230 }
const plotWidth = chart.width - chart.left - chart.right
const plotHeight = chart.height - chart.top - chart.bottom
const maxTasks = computed(() => Math.max(10, ...props.points.map((point) => point.taskCount)))
const step = computed(() => plotWidth / Math.max(1, props.points.length))
const linePoints = computed(() => props.points.map((point, index) => {
  const x = chart.left + step.value * index + step.value / 2
  const y = chart.top + plotHeight * (1 - point.utilizationRate / 100)
  return `${x},${y}`
}).join(' '))
const visibleLabelEvery = computed(() => props.points.length > 14 ? 5 : props.points.length > 7 ? 2 : 1)
</script>

<template>
  <svg class="analytics-trend-chart" viewBox="0 0 760 230" role="img" aria-label="稼动率与任务量趋势">
    <g class="trend-grid">
      <template v-for="tick in [0, 25, 50, 75, 100]" :key="tick">
        <line :x1="chart.left" :x2="chart.width - chart.right" :y1="chart.top + plotHeight * (1 - tick / 100)" :y2="chart.top + plotHeight * (1 - tick / 100)" />
        <text :x="chart.left - 8" :y="chart.top + plotHeight * (1 - tick / 100) + 4">{{ tick }}%</text>
      </template>
    </g>
    <g class="trend-bars">
      <rect
        v-for="(point, index) in points"
        :key="`bar-${point.label}`"
        :x="chart.left + step * index + step * .19"
        :y="chart.top + plotHeight * (1 - point.taskCount / maxTasks)"
        :width="Math.max(3, step * .62)"
        :height="plotHeight * point.taskCount / maxTasks"
        rx="2"
      />
    </g>
    <polyline class="trend-utilization-line" :points="linePoints" />
    <g class="trend-points">
      <circle v-for="(point, index) in points" :key="`point-${point.label}`" :cx="chart.left + step * index + step / 2" :cy="chart.top + plotHeight * (1 - point.utilizationRate / 100)" r="3" />
    </g>
    <g class="trend-labels">
      <template v-for="(point, index) in points" :key="`label-${point.label}`">
        <text v-if="index % visibleLabelEvery === 0 || index === points.length - 1" :x="chart.left + step * index + step / 2" :y="chart.height - 12">{{ point.label }}</text>
      </template>
    </g>
  </svg>
</template>
