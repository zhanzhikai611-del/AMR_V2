<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOperationLogs, getSystemLogs } from '../../api/modules/settings'
import type { OperationLog, SystemLog } from '../../types/settings'

type LogTab = 'system' | 'audit'
const route = useRoute()
const router = useRouter()
const tab = ref<LogTab>(route.query.tab === 'audit' ? 'audit' : 'system')
const systems = ref<SystemLog[]>([])
const operations = ref<OperationLog[]>([])
const query = ref('')
const level = ref('全部级别')
const module = ref('全部模块')
const selected = ref<SystemLog | OperationLog | null>(null)

const systemRows = computed(() => systems.value.filter(row =>
  (level.value === '全部级别' || row.level === level.value) &&
  (!query.value || Object.values(row).join(' ').toLowerCase().includes(query.value.toLowerCase())),
))
const auditRows = computed(() => operations.value.filter(row =>
  (module.value === '全部模块' || row.module === module.value) &&
  (!query.value || Object.values(row).join(' ').toLowerCase().includes(query.value.toLowerCase())),
))
function switchTab(next: LogTab) {
  tab.value = next
  query.value = ''
  selected.value = null
  router.replace({ query: next === 'audit' ? { tab: 'audit' } : {} })
}
async function copyTraceId() {
  if (selected.value && 'traceId' in selected.value) await navigator.clipboard?.writeText(selected.value.traceId)
}
watch(() => route.query.tab, value => { tab.value = value === 'audit' ? 'audit' : 'system' })
onMounted(async () => { [systems.value, operations.value] = await Promise.all([getSystemLogs(), getOperationLogs()]) })
</script>

<template>
  <section class="settings-page">
    <header class="settings-page__header">
      <div><p class="page-eyebrow">OBSERVABILITY & AUDIT</p><h1>系统日志</h1><p class="settings-lead">统一追踪系统异常与关键管理操作</p></div>
      <button class="settings-secondary">导出当前结果</button>
    </header>
    <nav class="settings-tabs" aria-label="日志类型">
      <button :class="{active:tab==='system'}" @click="switchTab('system')">运行日志 <span>{{ systems.length }}</span></button>
      <button :class="{active:tab==='audit'}" @click="switchTab('audit')">管理审计 <span>{{ operations.length }}</span></button>
    </nav>
    <div class="settings-toolbar">
      <label><span>⌕</span><input v-model="query" :placeholder="tab==='system'?'搜索服务、AMR、任务或 Trace ID':'搜索用户、模块、对象或操作'"></label>
      <div>
        <select v-if="tab==='system'" v-model="level"><option>全部级别</option><option>INFO</option><option>WARN</option><option>ERROR</option></select>
        <select v-else v-model="module"><option>全部模块</option><option>任务管理</option><option>实时监控</option><option>地图管理</option><option>行为树管理</option><option>资源管理</option></select>
        <select><option>今天</option><option>最近 7 天</option><option>最近 30 天</option></select>
      </div>
    </div>
    <div class="settings-table-wrap">
      <table v-if="tab==='system'" class="settings-table log-table"><thead><tr><th>时间</th><th>级别</th><th>服务</th><th>AMR</th><th>任务</th><th>Trace ID</th><th>日志摘要</th><th></th></tr></thead><tbody><tr v-for="row in systemRows" :key="row.traceId" @click="selected=row"><td class="type-data muted-cell">{{row.time}}</td><td><span class="log-level" :class="row.level.toLowerCase()">{{row.level}}</span></td><td>{{row.service}}</td><td>{{row.amr}}</td><td>{{row.task}}</td><td class="type-data settings-id">{{row.traceId}}</td><td>{{row.summary}}</td><td><button class="table-action">详情</button></td></tr></tbody></table>
      <table v-else class="settings-table log-table"><thead><tr><th>时间</th><th>操作人</th><th>模块</th><th>操作</th><th>对象</th><th>结果</th><th>说明</th><th></th></tr></thead><tbody><tr v-for="row in auditRows" :key="`${row.time}-${row.object}`" @click="selected=row"><td class="type-data muted-cell">{{row.time}}</td><td class="settings-id">{{row.user}}</td><td>{{row.module}}</td><td>{{row.action}}</td><td>{{row.object}}</td><td><span class="asset-status" :class="row.result==='成功'?'success':'fault'">{{row.result}}</span></td><td>{{row.description}}</td><td><button class="table-action">详情</button></td></tr></tbody></table>
    </div>
    <div v-if="selected" class="settings-drawer-backdrop" @click.self="selected=null"><aside class="log-detail-drawer"><header><div><small>{{tab==='system'?'LOG DETAIL':'AUDIT DETAIL'}}</small><strong>{{tab==='system'?'运行日志详情':'管理审计详情'}}</strong></div><button aria-label="关闭" @click="selected=null">×</button></header><dl><div v-for="(value,key) in selected" :key="key"><dt>{{key}}</dt><dd>{{value}}</dd></div></dl><footer><button v-if="'traceId' in selected" @click="copyTraceId">复制 Trace ID</button><button class="primary" @click="selected=null">关闭</button></footer></aside></div>
  </section>
</template>
