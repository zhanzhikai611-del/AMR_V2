<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getSystemLogs, settingsDemoMode } from '../../api/modules/settings'
import { createDemoLogSource, formatLogLine, logIdentity } from '../../features/settings/runtime-logs'
import type { SystemLog } from '../../types/settings'

const limit = 800
const logs = ref<SystemLog[]>([])
const paused = ref(false)
const follow = ref(true)
const wrap = ref(false)
const query = ref('')
const level = ref('')
const pending = ref<SystemLog[]>([])
const status = ref<'connecting'|'live'|'error'>('connecting')
const lastReceived = ref('')
const output = ref<HTMLElement | null>(null)
const message = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
let disposed = false
let demoNext: (() => SystemLog[]) | undefined
const seen = new Set<string>()
const visible = computed(() => logs.value.filter(row => (!level.value || row.level === level.value) && (!query.value.trim() || formatLogLine(row).toLowerCase().includes(query.value.trim().toLowerCase()))))
const stateLabel = computed(() => status.value === 'error' ? '连接中断 · 自动重试' : status.value === 'connecting' ? '正在连接' : paused.value ? '显示已暂停' : settingsDemoMode ? '模拟实时输出' : '实时拉取 · 2s')
async function scrollToEnd() {
  await nextTick()
  if (follow.value && output.value) output.value.scrollTop = output.value.scrollHeight
}
function accept(rows: SystemLog[]) {
  const fresh = rows.filter(row => {
    const id = logIdentity(row)
    if (seen.has(id)) return false
    seen.add(id); return true
  }).sort((a,b) => a.time.localeCompare(b.time))
  // Keep a longer identity history than the visible buffer to avoid duplicate polling results.
  while (seen.size > 10000) seen.delete(seen.values().next().value!)
  if (!fresh.length) return
  lastReceived.value = fresh[fresh.length-1]!.time
  if (paused.value) pending.value = [...pending.value, ...fresh].slice(-limit)
  else { logs.value = [...logs.value, ...fresh].sort((a,b) => a.time.localeCompare(b.time)).slice(-limit); void scrollToEnd() }
}
async function poll() {
  try {
    const rows = demoNext ? demoNext() : await getSystemLogs()
    if (disposed) return
    if (settingsDemoMode && !demoNext) demoNext = createDemoLogSource(rows)
    accept([...rows].sort((a,b) => a.time.localeCompare(b.time)).slice(-limit)); status.value = 'live'
  } catch { if (!disposed) status.value = 'error' }
  finally { if (!disposed) timer = setTimeout(poll, status.value === 'error' ? 5000 : 2000) }
}
function togglePause() {
  paused.value = !paused.value
  if (!paused.value) {
    logs.value = [...logs.value, ...pending.value].sort((a,b) => a.time.localeCompare(b.time)).slice(-limit)
    pending.value = []; void scrollToEnd()
  }
}
function onScroll() {
  const el = output.value
  if (el) follow.value = el.scrollHeight-el.scrollTop-el.clientHeight < 36
}
function toggleFollow() { follow.value = !follow.value; if (follow.value) void scrollToEnd() }
function download() {
  const text = visible.value.map(formatLogLine).join('\n')
  const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}))
  const link = document.createElement('a'); link.href = url; link.download = `amr-runtime-${new Date().toLocaleDateString('sv-SE')}.log`; link.click()
  setTimeout(() => URL.revokeObjectURL(url),1000)
  message.value = `已导出 ${visible.value.length} 行`
}
watch([query,level,wrap], () => { void scrollToEnd() })
onMounted(poll)
onBeforeUnmount(() => { disposed = true; clearTimeout(timer) })
</script>

<template>
  <section class="runtime-terminal" aria-label="系统运行终端">
    <header class="runtime-terminal__bar"><div class="runtime-terminal__identity"><span class="runtime-terminal__prompt">&gt;_</span><strong>amr / runtime.log</strong><span class="runtime-terminal__state" :class="{error:status==='error',paused}"><i></i>{{ stateLabel }}</span></div><div class="runtime-terminal__actions"><button :aria-pressed="paused" @click="togglePause">{{ paused?'继续输出':'暂停输出' }}</button><button :aria-pressed="follow" @click="toggleFollow">自动滚动 {{ follow?'开':'关' }}</button><button :aria-pressed="wrap" @click="wrap=!wrap">自动换行 {{ wrap?'开':'关' }}</button><button :disabled="!visible.length" @click="download">下载日志</button></div></header>
    <div class="runtime-terminal__filters"><label><span>⌕</span><input v-model="query" aria-label="搜索运行日志" placeholder="筛选关键词、AMR、任务或 Trace ID" /></label><select v-model="level" aria-label="运行日志级别"><option value="">全部级别</option><option>INFO</option><option>WARN</option><option>ERROR</option></select><span v-if="paused && pending.length">{{ pending.length }} 行待显示</span></div>
    <div ref="output" class="runtime-terminal__output" :class="{'is-wrap':wrap}" tabindex="0" role="region" aria-label="运行日志输出" @scroll="onScroll">
      <div v-if="!visible.length" class="runtime-terminal__empty">{{ status==='connecting'?'正在连接日志源…':status==='error'?'日志源暂不可用，5 秒后自动重试…':query || level?'没有匹配的日志':'等待系统输出…' }}</div>
      <div v-for="row in visible" :key="logIdentity(row)" class="runtime-terminal__line" :class="row.level.toLowerCase()"><time>{{ row.time }}</time> <b>{{ row.level.padEnd(5) }}</b> <span class="runtime-terminal__service">[{{ row.service }}]</span> <span>{{ row.summary }}</span> <span class="runtime-terminal__context">{{ row.amr!=='—'?`amr=${row.amr} `:'' }}{{ row.task!=='—'?`task=${row.task} `:'' }}{{ row.details }} trace={{ row.traceId }}</span></div>
    </div>
    <footer class="runtime-terminal__footer"><span>{{ visible.length }} 行 / 缓存 {{ logs.length }} 行 · 最多 {{ limit }} 行</span><span role="status">{{ message || (lastReceived?`最新 ${lastReceived}`:'等待日志') }}</span></footer>
  </section>
</template>

<style scoped>
.runtime-terminal{--terminal-bg:#10191f;--terminal-panel:#18242d;--terminal-line:#2c3c47;--terminal-text:#d4dee4;--terminal-muted:#8fa4b2;--terminal-cyan:#76c6de;background:var(--terminal-bg);color:var(--terminal-text);border:1px solid var(--terminal-line);border-radius:5px;overflow:hidden;font:12px/1.8 Consolas,'Cascadia Code','SFMono-Regular',monospace}
.runtime-terminal__bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;background:var(--terminal-panel);border-bottom:1px solid var(--terminal-line)}
.runtime-terminal__identity,.runtime-terminal__actions{display:flex;align-items:center;flex-wrap:wrap;gap:14px}.runtime-terminal__identity strong{font-weight:500;color:#edf4f7}.runtime-terminal__prompt{font-size:17px;color:var(--terminal-cyan)}
.runtime-terminal__state{display:inline-flex;align-items:center;gap:7px;color:#86c9ad;font:12px/1.5 var(--font-zh)}.runtime-terminal__state i{width:6px;height:6px;background:currentColor;border-radius:50%}.runtime-terminal__state.error{color:#ff9090}.runtime-terminal__state.paused{color:#edc47b}
.runtime-terminal button,.runtime-terminal select{color:var(--terminal-muted);background:transparent;border:1px solid var(--terminal-line);border-radius:3px;padding:5px 9px;cursor:pointer;font:12px/1.5 var(--font-zh)}.runtime-terminal button:hover{color:#fff;border-color:#627b8b}.runtime-terminal button[aria-pressed=true]{color:var(--terminal-cyan);border-color:#406275}.runtime-terminal button:disabled{opacity:.4;cursor:not-allowed}.runtime-terminal select{background:var(--terminal-panel)}.runtime-terminal button:focus-visible,.runtime-terminal input:focus-visible,.runtime-terminal select:focus-visible,.runtime-terminal__output:focus-visible{outline:2px solid var(--terminal-cyan);outline-offset:-2px}
.runtime-terminal__actions{gap:7px}.runtime-terminal__filters{display:flex;gap:12px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--terminal-line)}.runtime-terminal__filters label{display:flex;align-items:center;gap:9px;flex:1;max-width:520px;color:var(--terminal-muted)}.runtime-terminal__filters input{width:100%;padding:5px 0;color:var(--terminal-text);background:transparent;border:0;font:12px/1.5 var(--font-zh)}.runtime-terminal__filters input::placeholder{color:var(--terminal-muted)}.runtime-terminal__filters>span{color:#edc47b;margin-left:auto}
.runtime-terminal__output{height:calc(100dvh - 254px);min-height:320px;overflow:auto;padding:14px 0 24px;scrollbar-color:#435a69 var(--terminal-bg);overflow-anchor:none}.runtime-terminal__line{padding:2px 16px;white-space:pre;min-width:max-content;line-height:25px}.runtime-terminal__line:hover{background:#1b2a34}.runtime-terminal__line time{color:var(--terminal-muted)}.runtime-terminal__line b{color:#87c1e3;font-weight:400}.runtime-terminal__service{color:var(--terminal-cyan)}.runtime-terminal__context{color:var(--terminal-muted)}.runtime-terminal__line.warn{background:#edc47b08}.runtime-terminal__line.warn b,.runtime-terminal__line.warn>span:not(.runtime-terminal__context):not(.runtime-terminal__service){color:#edc47b}.runtime-terminal__line.error{background:#ff90900c}.runtime-terminal__line.error b,.runtime-terminal__line.error>span:not(.runtime-terminal__context):not(.runtime-terminal__service){color:#ff9090}.runtime-terminal__output.is-wrap .runtime-terminal__line{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}.runtime-terminal__empty{padding:16px;color:var(--terminal-muted)}
.runtime-terminal__footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:8px 16px;color:var(--terminal-muted);background:var(--terminal-panel);border-top:1px solid var(--terminal-line);font-size:11px}
@media(max-width:700px){.runtime-terminal__bar{padding:10px}.runtime-terminal__filters{padding:8px 10px;flex-wrap:wrap}.runtime-terminal__filters label{min-width:180px}.runtime-terminal__output{height:55dvh}.runtime-terminal__line{padding-inline:10px}}
</style>
