<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBehaviorTree } from '../api/modules/behaviors'
import type { BehaviorTreeDefinition } from '../types/domain'

type NodeKind = BehaviorTreeDefinition['nodes'][number]['kind']
type PaletteItem = { code: string; name: string; detail: string; kind: NodeKind }

const route = useRoute()
const router = useRouter()
const tree = ref<BehaviorTreeDefinition | null>(null)
const selectedId = ref<string | null>(null)
const canvasMode = ref<'select' | 'connect'>('select')
const connectionSourceId = ref<string | null>(null)
const zoom = ref(100)
const draggedItem = ref<PaletteItem | null>(null)
const statusMessage = ref('草稿已加载')
const validationTone = ref<'normal' | 'success' | 'fault'>('normal')
const nodeSettings = ref<Record<string, { timeout: number; failure: string }>>({})

const nodeGroups: Array<{ label: string; items: PaletteItem[] }> = [
  { label: '移动类', items: [
    { code: 'N', name: '导航至点位', detail: 'Navigate', kind: 'action' },
    { code: 'F', name: '跟随路径', detail: 'Follow path', kind: 'action' },
    { code: 'D', name: '对接站点', detail: 'Dock', kind: 'action' },
  ] },
  { label: '动作类', items: [
    { code: 'L', name: '执行上料', detail: 'Load', kind: 'action' },
    { code: 'U', name: '执行下料', detail: 'Unload', kind: 'action' },
    { code: 'W', name: '等待', detail: 'Wait', kind: 'action' },
  ] },
  { label: '感知类', items: [
    { code: 'C', name: '检查机台状态', detail: 'Check device', kind: 'condition' },
    { code: 'B', name: '检查剩余电量', detail: 'Check battery', kind: 'condition' },
  ] },
  { label: '脚本类', items: [
    { code: 'JS', name: '执行脚本', detail: 'Run script', kind: 'action' },
    { code: 'API', name: '调用接口', detail: 'Call API', kind: 'action' },
  ] },
]

const fallback = (): BehaviorTreeDefinition => ({
  id: route.params.id as string,
  name: route.query.name as string || '未命名结构',
  taskType: '成品转运',
  status: route.query.status === '已发布' ? '已发布' : '草稿',
  updatedAt: '2026-08-15 13:40',
  nodeCount: 1,
  summary: route.query.summary as string || '尚未配置',
  nodes: [{ id: 'root', name: route.query.name as string || '根节点', kind: 'sequence', x: 450, y: 72 }],
})

const selectedNode = computed(() => tree.value?.nodes.find((node) => node.id === selectedId.value) ?? null)
const connections = computed(() => (tree.value?.nodes ?? []).flatMap((node) => {
  if (!node.parentId) return []
  const parent = tree.value?.nodes.find((item) => item.id === node.parentId)
  return parent ? [{ id: `${parent.id}-${node.id}`, from: parent, to: node }] : []
}))
const structureValid = computed(() => Boolean(tree.value?.nodes.length) && tree.value!.nodes.slice(1).every((node) => node.parentId))

function startPaletteDrag(item: PaletteItem) {
  draggedItem.value = item
}

function addNode(event: DragEvent) {
  if (!tree.value || !draggedItem.value) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = Math.max(90, Math.min(810, (event.clientX - rect.left) / rect.width * 900))
  const y = Math.max(80, Math.min(500, (event.clientY - rect.top) / rect.height * 560))
  const id = `node-${Date.now()}`
  tree.value.nodes.push({ id, name: draggedItem.value.name, kind: draggedItem.value.kind, x, y })
  nodeSettings.value[id] = { timeout: 60, failure: '返回失败' }
  tree.value.nodeCount = tree.value.nodes.length
  selectedId.value = id
  draggedItem.value = null
  statusMessage.value = '已添加节点，请建立连接'
  validationTone.value = 'normal'
}

function selectNode(id: string) {
  if (!tree.value) return
  if (canvasMode.value === 'select') {
    selectedId.value = id
    return
  }
  if (!connectionSourceId.value) {
    connectionSourceId.value = id
    statusMessage.value = '请选择要连接的目标节点'
    return
  }
  if (connectionSourceId.value !== id) {
    const target = tree.value.nodes.find((node) => node.id === id)
    if (target) target.parentId = connectionSourceId.value
  }
  connectionSourceId.value = null
  selectedId.value = id
  statusMessage.value = '连接已建立'
}

function setMode(mode: 'select' | 'connect') {
  canvasMode.value = mode
  connectionSourceId.value = null
  statusMessage.value = mode === 'connect' ? '依次选择起点和目标节点' : '选择模式'
}

function deleteSelected() {
  if (!tree.value || !selectedNode.value || !selectedNode.value.parentId) return
  const id = selectedNode.value.id
  tree.value.nodes = tree.value.nodes.filter((node) => node.id !== id)
  tree.value.nodes.forEach((node) => { if (node.parentId === id) delete node.parentId })
  tree.value.nodeCount = tree.value.nodes.length
  selectedId.value = null
  statusMessage.value = '节点已删除'
  validationTone.value = 'normal'
}

function settingsFor(id: string) {
  return nodeSettings.value[id] ??= { timeout: 60, failure: '返回失败' }
}

function saveDraft() {
  if (!tree.value) return
  tree.value.status = '草稿'
  statusMessage.value = '草稿已保存'
  validationTone.value = 'success'
}

function validateTree() {
  validationTone.value = structureValid.value ? 'success' : 'fault'
  statusMessage.value = structureValid.value ? '结构校验通过' : '存在未连接节点，请完成连线'
}

function publishTree() {
  validateTree()
  if (!tree.value || !structureValid.value) return
  tree.value.status = '已发布'
  statusMessage.value = '行为树已发布'
}

onMounted(async () => {
  try { tree.value = await getBehaviorTree(route.params.id as string) } catch { tree.value = fallback() }
  tree.value.nodes.forEach((node) => { nodeSettings.value[node.id] = { timeout: 60, failure: '返回失败' } })
})
</script>

<template>
  <section v-if="tree" class="editor-page behavior-editor-page">
    <header class="editor-topbar">
      <div class="editor-breadcrumb"><button @click="router.push('/behaviors')">←</button><span>行为树列表 / <strong>{{ tree.name }}</strong></span><em>{{ tree.status }}</em></div>
      <div><button @click="saveDraft">保存草稿</button><button @click="validateTree">校验流程</button><button class="primary" @click="publishTree">发布</button></div>
    </header>

    <div class="behavior-editor-shell behavior-workbench">
      <aside class="editor-library behavior-node-library">
        <header><span>节点库</span><b>{{ nodeGroups.flatMap(group => group.items).length }}</b></header>
        <div class="behavior-library-scroll">
          <section v-for="group in nodeGroups" :key="group.label" class="behavior-palette-group"><h3>{{ group.label }}</h3><button v-for="item in group.items" :key="item.name" draggable="true" @dragstart="startPaletteDrag(item)"><i :class="item.kind">{{ item.code }}</i><span><strong>{{ item.name }}</strong><small>{{ item.detail }}</small></span></button></section>
        </div>
      </aside>

      <main class="behavior-canvas interactive-behavior-canvas" @dragover.prevent @drop="addNode">
        <div class="canvas-caption">{{ tree.id }} / {{ tree.taskType }}</div>
        <div class="canvas-tools"><button :class="{ active: canvasMode === 'select' }" @click="setMode('select')">选择</button><button :class="{ active: canvasMode === 'connect' }" @click="setMode('connect')">连线</button><button @click="zoom = Math.max(60, zoom - 10)">−</button><button>{{ zoom }}%</button><button @click="zoom = Math.min(160, zoom + 10)">＋</button></div>
        <svg viewBox="0 0 900 560" :style="{ transform: `scale(${zoom / 100})` }">
          <g class="tree-connectors"><path v-for="line in connections" :key="line.id" :d="`M${line.from.x} ${line.from.y + 29}V${(line.from.y + line.to.y) / 2}H${line.to.x}V${line.to.y - 29}`"/></g>
          <g v-for="node in tree.nodes" :key="node.id" :class="['editor-node', node.kind, { selected: selectedId === node.id, 'connection-source': connectionSourceId === node.id }]" :transform="`translate(${node.x} ${node.y})`" @click.stop="selectNode(node.id)"><rect x="-78" y="-29" width="156" height="58" rx="5"/><text class="node-title" y="1">{{ node.name }}</text><text class="node-kind" y="17">{{ node.kind }}</text></g>
        </svg>
        <footer class="editor-validation" :class="validationTone"><strong>{{ statusMessage }}</strong><span>{{ tree.nodes.length }} 个节点</span><span>{{ connections.length }} 条连接</span><span>拖动左侧节点到画布添加</span></footer>
      </main>

      <aside class="editor-properties behavior-properties">
        <header><span>节点属性</span><em v-if="selectedNode">{{ selectedNode.kind }}</em></header>
        <template v-if="selectedNode">
          <label>节点名称<input v-model="selectedNode.name"></label>
          <label>节点编号<input :value="selectedNode.id" disabled></label>
          <label>节点类型<select v-model="selectedNode.kind"><option value="sequence">控制节点</option><option value="action">动作节点</option><option value="condition">条件节点</option></select></label>
          <label>超时时间<input v-model.number="settingsFor(selectedNode.id).timeout" type="number" min="0"></label>
          <section class="behavior-runtime-policy"><h3>运行策略</h3><label>失败处理<select v-model="settingsFor(selectedNode.id).failure"><option>返回失败</option><option>重试 1 次</option><option>重试 2 次</option><option>终止任务</option></select></label></section>
          <button class="danger" :disabled="!selectedNode.parentId" @click="deleteSelected">删除节点</button>
        </template>
        <div v-else class="empty-inspector behavior-empty-inspector">
          <i aria-hidden="true"><span></span><span></span><span></span></i>
          <b>选择一个节点</b>
          <span>点击画布中的节点查看属性<br>也可以从左侧拖入新节点</span>
        </div>
      </aside>
    </div>
  </section>
</template>
