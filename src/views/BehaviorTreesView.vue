<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getBehaviorTrees } from '../api/modules/behaviors'
import type { BehaviorTreeDefinition } from '../types/domain'

const router = useRouter()
const trees = ref<BehaviorTreeDefinition[]>([])
const query = ref('')
const kindFilter = ref<BehaviorTreeDefinition['kind']>('行为树')
const createOpen = ref(false)
const newKind = ref<BehaviorTreeDefinition['kind']>('行为树')
const newName = ref('')
const newSummary = ref('')
const startDevice = ref('')
const targetDevice = ref('')
const behaviorType = ref('')
const editingTree = ref<BehaviorTreeDefinition | null>(null)

const devices = ['中转台', 'CNC', '充电站']
const behaviorTypes = ['上料', '下料', '上下料', '充电']
const generatedName = computed(() => [startDevice.value, targetDevice.value, behaviorType.value].filter(Boolean).join('-'))
const activeName = computed(() => newKind.value === '行为树' ? generatedName.value : newName.value.trim())
const filtered = computed(() => trees.value.filter((item) => {
  const matchesKind = item.kind === kindFilter.value
  const matchesQuery = `${item.id}${item.name}${item.summary}`.toLowerCase().includes(query.value.toLowerCase())
  return matchesKind && matchesQuery
}))
const kindCount = (kind: BehaviorTreeDefinition['kind']) => trees.value.filter((item) => item.kind === kind).length

function resetCreateForm() {
  newKind.value = '行为树'
  newName.value = ''
  newSummary.value = ''
  startDevice.value = ''
  targetDevice.value = ''
  behaviorType.value = ''
}

function closeCreate() {
  createOpen.value = false
  resetCreateForm()
}

function createTree() {
  if (!activeName.value) return
  const id = newKind.value === '行为树' ? 'BT-NEW' : 'ST-NEW'
  const params = new URLSearchParams({ name: activeName.value, summary: newSummary.value, kind: newKind.value })
  if (newKind.value === '行为树') params.set('status', '待发布')
  createOpen.value = false
  router.push(`/behaviors/${id}/edit?${params.toString()}`)
}

function openModify(tree: BehaviorTreeDefinition) {
  editingTree.value = { ...tree, nodes: [...tree.nodes] }
}

function saveModify() {
  if (!editingTree.value?.name.trim()) return
  const index = trees.value.findIndex((item) => item.id === editingTree.value!.id)
  if (index >= 0) trees.value[index] = editingTree.value
  editingTree.value = null
}

onMounted(async () => {
  trees.value = await getBehaviorTrees()
})
</script>

<template>
  <section class="resource-page">
    <header class="resource-page__header">
      <div><p class="page-eyebrow">BEHAVIOR LIBRARY</p><h1>行为树列表</h1></div>
      <button class="resource-primary-action" type="button" @click="createOpen = true">＋ 新建</button>
    </header>

    <div class="behavior-list-toolbar">
      <nav class="behavior-kind-tabs" aria-label="结构类型筛选">
        <button :class="{ active: kindFilter === '行为树' }" @click="kindFilter = '行为树'">行为树 <b>{{ kindCount('行为树') }}</b></button>
        <button :class="{ active: kindFilter === '子树' }" @click="kindFilter = '子树'">子树 <b>{{ kindCount('子树') }}</b></button>
      </nav>
      <label><span>⌕</span><input v-model="query" placeholder="搜索名称或编号"></label>
    </div>

    <div class="resource-table-wrap">
      <table class="resource-table">
        <thead><tr><th>编号</th><th>类型</th><th>名称</th><th>说明</th><th v-if="kindFilter === '行为树'">状态</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="tree in filtered" :key="tree.id">
            <td class="resource-id">{{ tree.id }}</td>
            <td><span class="tree-kind" :class="{ subtree: tree.kind === '子树' }">{{ tree.kind }}</span></td>
            <td><strong>{{ tree.name }}</strong></td>
            <td>{{ tree.summary }}</td>
            <td v-if="kindFilter === '行为树'"><span class="asset-status" :class="tree.status === '已发布' ? 'success' : 'draft'">{{ tree.status }}</span></td>
            <td class="type-data">{{ tree.updatedAt }}</td>
            <td><div class="row-actions behavior-row-actions"><button class="behavior-action behavior-action--modify" @click="openModify(tree)">修改</button><button class="behavior-action" @click="router.push(`/behaviors/${tree.id}/edit`)">编辑</button><button class="behavior-action behavior-action--danger">删除</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="createOpen" class="modal-backdrop" @click.self="closeCreate">
      <section class="create-dialog behavior-create-dialog">
        <header><div><span>CREATE STRUCTURE</span><strong>新建{{ newKind }}</strong></div><button aria-label="关闭" @click="closeCreate">×</button></header>
        <div class="create-kind-choice">
          <button type="button" :class="{ active: newKind === '行为树' }" @click="newKind = '行为树'"><b>BT</b><strong>行为树</strong></button>
          <button type="button" :class="{ active: newKind === '子树' }" @click="newKind = '子树'"><b>ST</b><strong>子树</strong></button>
        </div>
        <template v-if="newKind === '行为树'">
          <div class="behavior-name-builder">
            <label><span>起始设备</span><select v-model="startDevice"><option value="" disabled>请选择</option><option v-for="device in devices" :key="device">{{ device }}</option></select></label>
            <i>→</i>
            <label><span>目标设备</span><select v-model="targetDevice"><option value="" disabled>请选择</option><option v-for="device in devices" :key="device">{{ device }}</option></select></label>
            <i>→</i>
            <label><span>行为类型</span><select v-model="behaviorType"><option value="" disabled>请选择</option><option v-for="type in behaviorTypes" :key="type">{{ type }}</option></select></label>
          </div>
          <div class="generated-behavior-name"><small>生成名称</small><strong>{{ generatedName || '选择以上字段后自动生成' }}</strong></div>
        </template>
        <label v-else>名称<input v-model="newName" placeholder="例如：站点对接检查"></label>
        <label>说明<textarea v-model="newSummary" rows="3" placeholder="简要说明流程步骤和用途"></textarea></label>
        <label v-if="newKind === '行为树'">状态<input value="待发布" disabled></label>
        <footer><button @click="closeCreate">取消</button><button class="primary" :disabled="!activeName" @click="createTree">创建并编辑</button></footer>
      </section>
    </div>

    <div v-if="editingTree" class="modal-backdrop" @click.self="editingTree = null">
      <section class="create-dialog">
        <header><div><span>EDIT INFORMATION</span><strong>修改{{ editingTree.kind }}信息</strong></div><button @click="editingTree = null">×</button></header>
        <label>名称<input v-model="editingTree.name" :disabled="editingTree.kind === '行为树'"></label>
        <label>说明<textarea v-model="editingTree.summary" rows="3"></textarea></label>
        <label v-if="editingTree.kind === '行为树'">状态<select v-model="editingTree.status"><option>待发布</option><option>已发布</option></select></label>
        <footer><button @click="editingTree = null">取消</button><button class="primary" :disabled="!editingTree.name.trim()" @click="saveModify">保存修改</button></footer>
      </section>
    </div>
  </section>
</template>
