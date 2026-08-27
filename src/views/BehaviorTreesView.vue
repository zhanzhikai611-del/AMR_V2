<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getBehaviorTrees, updateBehaviorTreeBindings } from '../api/modules/behaviors'
import { getResourceCatalog } from '../api/modules/resources'
import type { Amr, BehaviorTreeDefinition } from '../types/domain'

const router = useRouter()
const trees = ref<BehaviorTreeDefinition[]>([])
const query = ref('')
const kind = ref<'behavior' | 'subtree'>('behavior')
const createOpen = ref(false)
const createKind = ref<'behavior' | 'subtree'>('behavior')
const newName = ref('')
const amrs = ref<Amr[]>([])
const bindingTree = ref<BehaviorTreeDefinition | null>(null)
const selectedAmrIds = ref<string[]>([])

const filtered = computed(() => trees.value.filter((item) =>
  `${item.id}${item.name}${item.taskType}`.toLowerCase().includes(query.value.toLowerCase())
  && item.kind === kind.value,
))

const count = (value: 'behavior' | 'subtree') => trees.value.filter((item) => item.kind === value).length

function createTree() {
  if (!newName.value.trim()) return
  createOpen.value = false
  router.push(`/behaviors/${createKind.value === 'behavior' ? 'BT-NEW' : 'ST-NEW'}/edit?kind=${createKind.value}&name=${encodeURIComponent(newName.value)}`)
}

function openBinding(tree: BehaviorTreeDefinition) {
  bindingTree.value = tree
  selectedAmrIds.value = [...(tree.boundAmrIds ?? [])]
}

async function saveBindings() {
  if (!bindingTree.value) return
  const amrIds = await updateBehaviorTreeBindings(bindingTree.value.id, selectedAmrIds.value)
  bindingTree.value.boundAmrIds = amrIds
  bindingTree.value = null
}

onMounted(async () => {
  const [behaviorTrees, catalog] = await Promise.all([getBehaviorTrees(), getResourceCatalog()])
  trees.value = behaviorTrees
  amrs.value = catalog.amrs
})
</script>

<template>
  <section class="resource-page">
    <header class="resource-page__header">
      <div><p class="page-eyebrow">BEHAVIOR LIBRARY</p><h1>行为树列表</h1></div>
      <button class="resource-primary-action" type="button" @click="createOpen = true">＋ 新建</button>
    </header>

    <div class="behavior-list-toolbar">
      <div class="behavior-kind-tabs">
        <button :class="{ active: kind === 'behavior' }" @click="kind = 'behavior'">行为树 <b>{{ count('behavior') }}</b></button>
        <button :class="{ active: kind === 'subtree' }" @click="kind = 'subtree'">子树 <b>{{ count('subtree') }}</b></button>
      </div>
      <label><span>⌕</span><input v-model="query" placeholder="搜索名称或编号"></label>
    </div>

    <div class="resource-table-wrap">
      <table class="resource-table">
        <thead><tr><th>编号</th><th>类型</th><th>名称</th><th>流程摘要</th><th>版本</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="tree in filtered" :key="tree.id">
            <td class="resource-id">{{ tree.id }}</td>
            <td><span class="tree-kind" :class="tree.kind">{{ tree.kind === 'behavior' ? '行为树' : '子树' }}</span></td>
            <td><strong>{{ tree.name }}</strong></td>
            <td>{{ tree.summary }}</td>
            <td class="type-data">{{ tree.version }}</td>
            <td><span class="asset-status" :class="tree.status === '已发布' ? 'success' : 'draft'">{{ tree.status }}</span></td>
            <td class="type-data">{{ tree.updatedAt }}</td>
            <td><div class="row-actions"><button v-if="tree.kind === 'behavior'" class="table-action binding-action" @click="openBinding(tree)">绑定</button><button class="table-action" @click="router.push(`/behaviors/${tree.id}/edit?kind=${tree.kind}`)">编辑</button><button class="danger-link">删除</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="bindingTree" class="modal-backdrop" @click.self="bindingTree = null">
      <section class="binding-dialog" role="dialog" aria-modal="true" aria-labelledby="binding-dialog-title">
        <header><div><span>AMR EXECUTION SCOPE</span><strong id="binding-dialog-title">绑定可执行 AMR</strong><small>{{ bindingTree.name }} · {{ bindingTree.id }}</small></div><button type="button" aria-label="关闭" @click="bindingTree = null">×</button></header>
        <div class="binding-dialog__summary"><span>已选择 <strong>{{ selectedAmrIds.length }}</strong> 台</span><small>仅被选中的 AMR 可执行该行为树</small></div>
        <div class="amr-binding-list">
          <label v-for="amr in amrs" :key="amr.id" :class="{ selected: selectedAmrIds.includes(amr.id) }">
            <input v-model="selectedAmrIds" type="checkbox" :value="amr.id">
            <span><strong>{{ amr.id }}</strong><small>{{ amr.name }} · {{ amr.model }}</small></span>
            <em :class="amr.tone"><i class="status-dot" :class="amr.tone"></i>{{ amr.status }}</em>
          </label>
        </div>
        <footer><button type="button" @click="bindingTree = null">取消</button><button class="primary" type="button" @click="saveBindings">保存绑定</button></footer>
      </section>
    </div>

    <div v-if="createOpen" class="modal-backdrop" @click.self="createOpen = false">
      <section class="create-dialog">
        <header><div><span>CREATE STRUCTURE</span><strong>新建行为结构</strong></div><button @click="createOpen = false">×</button></header>
        <div class="create-kind-choice">
          <button :class="{ active: createKind === 'behavior' }" @click="createKind = 'behavior'"><b>BT</b><span><strong>行为树</strong><small>可绑定任务类型并独立执行</small></span></button>
          <button :class="{ active: createKind === 'subtree' }" @click="createKind = 'subtree'"><b>ST</b><span><strong>子树</strong><small>封装公共流程，供行为树引用</small></span></button>
        </div>
        <label>名称<input v-model="newName" :placeholder="createKind === 'behavior' ? '例如：CNC 成品转运' : '例如：标准取料单元'"></label>
        <footer><button @click="createOpen = false">取消</button><button class="primary" :disabled="!newName.trim()" @click="createTree">创建并编辑</button></footer>
      </section>
    </div>
  </section>
</template>
