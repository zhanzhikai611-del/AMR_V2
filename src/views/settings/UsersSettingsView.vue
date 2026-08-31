<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getSystemUsers } from '../../api/modules/settings'
import type { SystemUser } from '../../types/settings'

const users = ref<SystemUser[]>([])
const query = ref('')
const role = ref('全部角色')
const status = ref('全部状态')
const editing = ref<SystemUser | null>(null)
const originalUsername = ref('')
const filtered = computed(() => users.value.filter(user =>
  (!query.value || `${user.username}${user.name}`.toLowerCase().includes(query.value.toLowerCase())) &&
  (role.value === '全部角色' || user.role === role.value) &&
  (status.value === '全部状态' || user.status === status.value),
))

function create() {
  originalUsername.value = ''
  editing.value = { username:'', name:'', role:'只读用户', status:'启用', lastLogin:'—', createdAt:new Date().toISOString().slice(0,10) }
}
function edit(user: SystemUser) {
  originalUsername.value = user.username
  editing.value = { ...user }
}
function save() {
  if (!editing.value) return
  const index = users.value.findIndex(user => user.username === originalUsername.value)
  if (index < 0) users.value.push({ ...editing.value })
  else users.value[index] = { ...editing.value }
  editing.value = null
}
function toggle(user: SystemUser) { user.status = user.status === '启用' ? '停用' : '启用' }
onMounted(async () => { users.value = await getSystemUsers() })
</script>

<template>
  <section class="settings-page">
    <header class="settings-page__header">
      <div><p class="page-eyebrow">IDENTITY & ACCESS</p><h1>用户管理</h1><p class="settings-lead">管理账号、角色归属与访问状态</p></div>
      <button class="settings-primary" @click="create">＋ 新增用户</button>
    </header>
    <div class="settings-toolbar">
      <label><span>⌕</span><input v-model="query" placeholder="搜索用户名或姓名"></label>
      <div><select v-model="role"><option>全部角色</option><option>只读用户</option><option>研发人员</option><option>系统管理员</option></select><select v-model="status"><option>全部状态</option><option>启用</option><option>停用</option></select></div>
    </div>
    <div class="settings-table-wrap"><table class="settings-table"><thead><tr><th>用户名</th><th>姓名</th><th>角色</th><th>状态</th><th>最近登录</th><th>创建日期</th><th>操作</th></tr></thead><tbody><tr v-for="user in filtered" :key="user.username"><td class="type-data settings-id">{{user.username}}</td><td>{{user.name}}</td><td><span class="settings-tag" :class="user.role">{{user.role}}</span></td><td><span class="asset-status" :class="user.status==='启用'?'success':'neutral'">{{user.status}}</span></td><td class="muted-cell">{{user.lastLogin}}</td><td class="muted-cell">{{user.createdAt}}</td><td><div class="row-actions"><button class="table-action" @click="edit(user)">编辑</button><button class="table-action" @click="toggle(user)">{{user.status==='启用'?'停用':'启用'}}</button></div></td></tr></tbody></table></div>
    <div v-if="editing" class="modal-backdrop" @click.self="editing=null"><section class="settings-dialog"><header><div><small>USER PROFILE</small><strong>{{originalUsername?'编辑用户':'新增用户'}}</strong></div><button aria-label="关闭" @click="editing=null">×</button></header><div class="settings-dialog__body"><label>用户名<input v-model.trim="editing.username" :readonly="!!originalUsername" placeholder="例如 dev.frontend"></label><label>姓名<input v-model.trim="editing.name" placeholder="用户显示名称"></label><label>角色<select v-model="editing.role"><option>只读用户</option><option>研发人员</option><option>系统管理员</option></select></label><label>状态<select v-model="editing.status"><option>启用</option><option>停用</option></select></label><p class="form-boundary">角色决定可访问的页面；停用账号后禁止登录，但保留历史审计记录。</p></div><footer><button @click="editing=null">取消</button><button class="primary" :disabled="!editing.username||!editing.name" @click="save">保存用户</button></footer></section></div>
  </section>
</template>
