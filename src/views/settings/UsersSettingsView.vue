<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getSystemUsers, getSystemRoles, saveSystemUser } from '../../api/modules/settings'
import type { SystemUser, SystemRole } from '../../types/settings'
const users = ref<SystemUser[]>([])
const roles = ref<SystemRole[]>([])
const query = ref('')
const role = ref('')
const status = ref('')
const editing = ref<SystemUser | null>(null)
const originalUsername = ref('')
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const filtered = computed(() => users.value.filter(user =>
  (!query.value.trim() || `${user.username} ${user.name} ${user.departmentCode ?? ""} ${user.departmentName ?? ""}`.toLowerCase().includes(query.value.trim().toLowerCase())) &&
  (!role.value || user.role === role.value) && (!status.value || user.status === status.value)))
async function load() {
  loading.value = true; error.value = ''
  try { [users.value, roles.value] = await Promise.all([getSystemUsers(), getSystemRoles()]) }
  catch { error.value = '用户数据加载失败，请重试。' }
  finally { loading.value = false }
}
function create() {
  originalUsername.value = ''; error.value = ''; notice.value = ''
  editing.value = { username:'', name:'', departmentCode:'', departmentName:'', email:'', loginIp:'', role:roles.value.find(item => item.name === '只读用户')?.name ?? roles.value[0]?.name ?? '', status:'启用', lastLogin:'—', createdAt:new Date().toLocaleDateString('sv-SE') }
}
function edit(user: SystemUser) { originalUsername.value = user.username; editing.value = { departmentCode:'', departmentName:'', email:'', loginIp:'', ...user }; error.value = ''; notice.value = '' }
async function save() {
  if (!editing.value || busy.value) return
  busy.value = true; error.value = ''
  try { await saveSystemUser({ ...editing.value }, originalUsername.value); editing.value = null; await load(); notice.value = '用户已保存。' }
  catch (e) { error.value = e instanceof Error ? e.message : '保存失败，请重试。' }
  finally { busy.value = false }
}
async function toggle(user: SystemUser) {
  if (busy.value) return
  if (user.status === '启用' && !window.confirm(`确定停用用户「${user.username}」？历史记录将保留。`)) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await saveSystemUser({ ...user, status:user.status === '启用' ? '停用' : '启用' }, user.username); await load(); notice.value = '账号状态已更新。' }
  catch (e) { error.value = e instanceof Error ? e.message : '更新失败，请重试。' }
  finally { busy.value = false }
}
function close() { if (!busy.value) { editing.value = null; error.value = '' } }
onMounted(load)
</script>

<template>
  <section class="settings-page">
    <header class="settings-page__header">
      <div><p class="page-eyebrow">IDENTITY & ACCESS</p><h1>用户管理</h1></div>
      <button class="settings-primary" :disabled="loading || !roles.length" @click="create">＋ 新增用户</button>
    </header>
    <p v-if="error && !editing" class="settings-error" role="alert">{{ error }} <button class="table-action" @click="load">重新加载</button></p>
    <p v-if="notice" class="settings-notice" role="status">{{ notice }}</p>
    <div class="settings-toolbar">
      <label><span>⌕</span><input v-model="query" placeholder="搜索工号、昵称或部门" aria-label="搜索用户"></label>
      <div><select v-model="role" aria-label="筛选角色"><option value="">全部角色</option><option v-for="item in roles" :key="item.name">{{ item.name }}</option></select><select v-model="status" aria-label="筛选状态"><option value="">全部状态</option><option>启用</option><option>停用</option></select></div>
      <span class="settings-hint">共 {{ filtered.length }} 个用户</span>
    </div>
    <div class="settings-table-wrap"><table class="settings-table settings-users-table"><thead><tr><th>工号</th><th>用户昵称</th><th>角色</th><th>状态</th><th>最近登录</th><th>创建日期</th><th class="settings-actions-column">操作</th></tr></thead><tbody>
      <tr v-for="user in filtered" :key="user.username"><td class="type-data settings-id">{{ user.username }}</td><td>{{ user.name }}</td><td><span class="settings-tag" :class="user.role">{{ user.role }}</span></td><td><span class="asset-status" :class="user.status==='启用'?'success':'neutral'">{{ user.status }}</span></td><td class="muted-cell">{{ user.lastLogin }}</td><td class="muted-cell">{{ user.createdAt }}</td><td class="settings-actions-column"><div class="row-actions"><button class="table-action" :disabled="busy" @click="edit(user)">编辑</button><button class="table-action" :disabled="busy" @click="toggle(user)">{{ user.status==='启用'?'停用':'启用' }}</button></div></td></tr>
      <tr v-if="loading || !filtered.length"><td colspan="7" class="settings-empty">{{ loading ? '正在加载用户…' : '没有匹配的用户，请调整筛选条件或新增用户。' }}</td></tr>
    </tbody></table></div>
    <div v-if="editing" class="modal-backdrop" @click.self="close" @keydown.esc="close"><form class="settings-dialog settings-user-dialog" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title" @submit.prevent="save"><header><div><small>USER PROFILE</small><strong id="user-dialog-title">{{ originalUsername?'编辑用户':'新增用户' }}</strong></div><button type="button" aria-label="关闭" :disabled="busy" @click="close">×</button></header><div class="settings-dialog__body settings-user-form">
      <label for="user-number"><span class="required-field">工号</span><input id="user-number" v-model.trim="editing.username" :readonly="!!originalUsername" :disabled="busy" maxlength="40" required placeholder="请输入工号"></label>
      <label for="user-nickname"><span class="required-field">用户昵称</span><input id="user-nickname" v-model.trim="editing.name" :disabled="busy" maxlength="40" required placeholder="请输入用户昵称"></label>
      <label for="user-department-code"><span>部门代码</span><input id="user-department-code" v-model.trim="editing.departmentCode" :disabled="busy" maxlength="40" placeholder="请输入部门代码"></label>
      <label for="user-department-name"><span>部门名称</span><input id="user-department-name" v-model.trim="editing.departmentName" :disabled="busy" maxlength="80" placeholder="请输入部门名称"></label>
      <label for="user-email"><span>邮箱</span><input id="user-email" v-model.trim="editing.email" :disabled="busy" type="email" maxlength="254" placeholder="请输入邮箱"></label>
      <label for="user-login-ip"><span>登录 IP</span><input id="user-login-ip" v-model.trim="editing.loginIp" :disabled="busy" maxlength="45" placeholder="请输入登录 IP（可选）"></label>
      <label for="user-role"><span class="required-field">角色分配</span><select id="user-role" v-model="editing.role" :disabled="busy" required><option value="" disabled>请选择角色</option><option v-for="item in roles" :key="item.name">{{ item.name }}</option></select></label>
      <fieldset class="settings-user-status" :disabled="busy"><legend>状态</legend><div><label><input v-model="editing.status" type="radio" value="启用" name="user-status">正常</label><label><input v-model="editing.status" type="radio" value="停用" name="user-status">停用</label></div></fieldset>
      <p v-if="error" class="settings-error" role="alert">{{ error }}</p>
    </div><footer><button type="button" :disabled="busy" @click="close">取消</button><button class="primary" :disabled="busy || !editing.username || !editing.name || !editing.role">{{ busy?'保存中…':'保存用户' }}</button></footer></form></div>
  </section>
</template>
