<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getTaskRecords } from '../api/modules/task-records'
import type { TaskRecord } from '../types/domain'

const records = ref<TaskRecord[]>([])
const query = ref('')
const resultFilter = ref('全部结果')
const dateFilter = ref('近 7 天')
const filtered = computed(() => records.value.filter((item) => {
  const matchesQuery = `${item.id}${item.type}${item.requestDeviceId}${item.amrId}`.toLowerCase().includes(query.value.toLowerCase())
  const recordDate = new Date(item.requestedAt.replace(' ', 'T')).getTime()
  const cutoff = dateFilter.value === '今日' ? new Date('2026-08-15T00:00:00').getTime() : dateFilter.value === '近 7 天' ? new Date('2026-08-09T00:00:00').getTime() : dateFilter.value === '近 30 天' ? new Date('2026-07-17T00:00:00').getTime() : 0
  return matchesQuery && recordDate >= cutoff && (resultFilter.value === '全部结果' || item.result === resultFilter.value)
}))
onMounted(async () => { records.value = await getTaskRecords() })
</script>

<template>
  <section class="resource-page">
    <header class="resource-page__header"><div><p class="page-eyebrow">TASK ARCHIVE</p><h1>任务记录</h1><p>任务结束后进入归档，保留请求设备、执行车辆、行为版本与最终结果。</p></div><button class="resource-primary-action" type="button">导出记录</button></header>
    <div class="record-summary"><span><small>历史任务</small><strong>{{ records.length }}</strong></span><span><small>已完成</small><strong>{{ records.filter(r => r.result === '已完成').length }}</strong></span><span><small>已取消</small><strong>{{ records.filter(r => r.result === '已取消').length }}</strong></span></div>
    <div class="resource-toolbar"><label><span>⌕</span><input v-model="query" placeholder="任务编号、请求设备或 AMR"></label><div><select v-model="resultFilter"><option>全部结果</option><option>已完成</option><option>已取消</option></select><select v-model="dateFilter"><option>今日</option><option>近 7 天</option><option>近 30 天</option><option>全部日期</option></select></div></div>
    <div class="resource-table-wrap"><table class="resource-table"><thead><tr><th>任务编号</th><th>任务类型</th><th>请求设备</th><th>执行 AMR</th><th>开始时间</th><th>结束时间</th><th>耗时</th><th>行为树</th><th>结果</th><th>操作</th></tr></thead><tbody><tr v-for="item in filtered" :key="item.id"><td class="resource-id">{{ item.id }}</td><td><strong>{{ item.type }}</strong></td><td class="type-data">{{ item.requestDeviceId }}</td><td class="type-data">{{ item.amrId }}</td><td class="type-data">{{ item.requestedAt }}</td><td class="type-data">{{ item.finishedAt }}</td><td class="type-data">{{ item.duration }}</td><td>{{ item.behaviorName }}</td><td><span class="asset-status" :class="item.result === '已完成' ? 'success' : 'waiting'">{{ item.result }}</span></td><td><button class="table-action" type="button">查看详情</button></td></tr></tbody></table></div>
  </section>
</template>
