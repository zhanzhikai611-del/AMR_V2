<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getBehaviorTrees } from '../api/modules/behaviors'
import type { BehaviorTreeDefinition } from '../types/domain'

const router = useRouter()
const trees = ref<BehaviorTreeDefinition[]>([])
const query = ref('')
const createOpen = ref(false)
const newName = ref('')
const newSummary = ref('')
const newStatus = ref<BehaviorTreeDefinition['status']>('草稿')
const editingTree = ref<BehaviorTreeDefinition | null>(null)

const filtered = computed(() => trees.value.filter((item) =>
  `${item.id}${item.name}${item.summary}`.toLowerCase().includes(query.value.toLowerCase()),
))

function createTree() {
  if (!newName.value.trim()) return
  createOpen.value = false
  router.push(`/behaviors/BT-NEW/edit?name=${encodeURIComponent(newName.value)}&summary=${encodeURIComponent(newSummary.value)}&status=${encodeURIComponent(newStatus.value)}`)
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
      <label><span>⌕</span><input v-model="query" placeholder="搜索名称或编号"></label>
    </div>

    <div class="resource-table-wrap">
      <table class="resource-table">
        <thead><tr><th>编号</th><th>名称</th><th>流程概述</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="tree in filtered" :key="tree.id">
            <td class="resource-id">{{ tree.id }}</td>
            <td><strong>{{ tree.name }}</strong></td>
            <td>{{ tree.summary }}</td>
            <td><span class="asset-status" :class="tree.status === '已发布' ? 'success' : 'draft'">{{ tree.status }}</span></td>
            <td class="type-data">{{ tree.updatedAt }}</td>
            <td><div class="row-actions behavior-row-actions"><button class="behavior-action behavior-action--modify" @click="openModify(tree)">修改</button><button class="behavior-action" @click="router.push(`/behaviors/${tree.id}/edit`)">编辑</button><button class="behavior-action behavior-action--danger">删除</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="createOpen" class="modal-backdrop" @click.self="createOpen = false">
      <section class="create-dialog">
        <header><div><span>CREATE BEHAVIOR TREE</span><strong>新建行为树</strong></div><button @click="createOpen = false">×</button></header>
        <label>名称<input v-model="newName" placeholder="例如：设备补料流程"></label>
        <label>流程概述<textarea v-model="newSummary" rows="3" placeholder="简要说明流程步骤和用途"></textarea></label>
        <label>状态<select v-model="newStatus"><option>草稿</option><option>已发布</option></select></label>
        <footer><button @click="createOpen = false">取消</button><button class="primary" :disabled="!newName.trim()" @click="createTree">创建并编辑</button></footer>
      </section>
    </div>

    <div v-if="editingTree" class="modal-backdrop" @click.self="editingTree = null">
      <section class="create-dialog">
        <header><div><span>EDIT INFORMATION</span><strong>修改行为树信息</strong></div><button @click="editingTree = null">×</button></header>
        <label>名称<input v-model="editingTree.name"></label>
        <label>流程概述<textarea v-model="editingTree.summary" rows="3"></textarea></label>
        <label>状态<select v-model="editingTree.status"><option>草稿</option><option>已发布</option></select></label>
        <footer><button @click="editingTree = null">取消</button><button class="primary" :disabled="!editingTree.name.trim()" @click="saveModify">保存修改</button></footer>
      </section>
    </div>
  </section>
</template>
