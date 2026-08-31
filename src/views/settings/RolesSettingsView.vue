<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { deleteSystemRole, getSystemRoles, getSystemUsers, saveSystemRole } from '../../api/modules/settings'
import { permissionPages } from '../../features/settings/permissions'
import type { SystemRole, SystemUser } from '../../types/settings'
const roles = ref<SystemRole[]>([])
const users = ref<SystemUser[]>([])
const query = ref('')
const editing = ref<SystemRole | null>(null)
const original = ref('')
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const groups = [...new Set(permissionPages.map(page => page.group))]
const filtered = computed(() => roles.value.filter(role => `${role.name} ${role.summary}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const count = (name: string) => users.value.filter(user => user.role === name).length
async function load() {
  loading.value = true; error.value = ''
  try { [roles.value, users.value] = await Promise.all([getSystemRoles(), getSystemUsers()]) }
  catch { error.value = '角色数据加载失败，请重试。' }
  finally { loading.value = false }
}
function open(role?: SystemRole) {
  original.value = role?.name ?? ''; error.value = ''; notice.value = ''
  editing.value = role ? { ...role, permissions:[...role.permissions] } : { name:'', summary:'', builtin:false, permissions:[] }
}
function locked(id: string) { return original.value === '系统管理员' && ['users','roles','system-logs'].includes(id) }
function selectGroup(group: string) {
  if (!editing.value) return
  const ids = permissionPages.filter(page => page.group === group).map(page => page.id)
  const all = ids.every(id => editing.value!.permissions.includes(id))
  editing.value.permissions = all ? editing.value.permissions.filter(id => !ids.includes(id) || locked(id)) : [...new Set([...editing.value.permissions, ...ids])]
}
async function save() {
  if (!editing.value || busy.value) return
  busy.value = true; error.value = ''
  try { await saveSystemRole({ ...editing.value, permissions:[...editing.value.permissions] }, original.value); editing.value = null; await load(); notice.value = '角色已保存，用户管理中可选择该角色。' }
  catch (e) { error.value = e instanceof Error ? e.message : '保存失败，请重试。' }
  finally { busy.value = false }
}
async function remove(role: SystemRole) {
  if (!window.confirm(`确定删除角色「${role.name}」？`)) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await deleteSystemRole(role.name); await load(); notice.value = '角色已删除。' }
  catch (e) { error.value = e instanceof Error ? e.message : '删除失败，请重试。' }
  finally { busy.value = false }
}
function close() { if (!busy.value) { editing.value = null; error.value = '' } }
onMounted(load)
</script>

<template>
  <section class="settings-page">
    <header class="settings-page__header"><div><p class="page-eyebrow">ROLE & PERMISSIONS</p><h1>角色权限</h1></div><button class="settings-primary" :disabled="loading" @click="open()">＋ 创建角色</button></header>
    <p v-if="error && !editing" class="settings-error" role="alert">{{ error }} <button class="table-action" @click="load">重新加载</button></p><p v-if="notice" class="settings-notice" role="status">{{ notice }}</p>
    <div class="settings-toolbar"><label><span>⌕</span><input v-model="query" placeholder="搜索角色名称或说明" aria-label="搜索角色"></label><span class="settings-hint">{{ roles.filter(role => role.builtin).length }} 个默认角色 · {{ roles.filter(role => !role.builtin).length }} 个自定义角色</span></div>
    <div class="settings-table-wrap settings-role-list"><table class="settings-table"><thead><tr><th>角色名称</th><th>类型</th><th>说明</th><th>用户数</th><th>页面权限</th><th class="settings-actions-column">操作</th></tr></thead><tbody><tr v-for="role in filtered" :key="role.name"><td><strong>{{ role.name }}</strong></td><td><span class="settings-tag">{{ role.builtin ? '默认' : '自定义' }}</span></td><td>{{ role.summary || '—' }}</td><td>{{ count(role.name) }}</td><td>{{ role.permissions.length }} 项</td><td class="settings-actions-column"><div class="row-actions"><button class="table-action" :disabled="busy" @click="open(role)">编辑</button><button v-if="!role.builtin" class="table-action" :disabled="busy || count(role.name)>0" :title="count(role.name) ? '请先调整该角色下的用户' : '删除角色'" @click="remove(role)">删除</button></div></td></tr></tbody></table></div>
    <p v-if="loading || !filtered.length" class="settings-empty">{{ loading ? '正在加载角色…' : '没有匹配的角色' }}</p>
    <section class="permission-panel page-access-panel"><header><div><strong>页面访问矩阵</strong></div></header><div class="settings-matrix-scroll"><table class="access-matrix"><thead><tr><th>页面分组</th><th>页面</th><th v-for="role in filtered" :key="role.name">{{ role.name }}</th></tr></thead><tbody><tr v-for="page in permissionPages" :key="page.id"><td>{{ page.group }}</td><td><strong>{{ page.name }}</strong></td><td v-for="role in filtered" :key="role.name"><span :class="{ allowed:role.permissions.includes(page.id) }">{{ role.permissions.includes(page.id)?'允许':'—' }}</span></td></tr></tbody></table></div></section>
    <div v-if="editing" class="modal-backdrop" @click.self="close" @keydown.esc="close"><form class="settings-dialog settings-role-dialog" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title" @submit.prevent="save"><header><div><small>ROLE CONFIGURATION</small><strong id="role-dialog-title">{{ original?'配置角色权限':'创建角色' }}</strong></div><button type="button" :disabled="busy" aria-label="关闭" @click="close">×</button></header><div class="settings-dialog__body"><label>角色名称<input v-model.trim="editing.name" :readonly="editing.builtin" :disabled="busy" maxlength="24" required placeholder="例如：现场运维"></label><label>角色说明<input v-model.trim="editing.summary" :disabled="busy" maxlength="160" placeholder="说明职责与使用范围"></label><div class="settings-permissions settings-form-wide"><div class="settings-permissions-heading"><strong>页面访问权限</strong><span>已选 {{ editing.permissions.length }} / {{ permissionPages.length }}</span></div><fieldset v-for="group in groups" :key="group" :disabled="busy"><legend>{{ group }} <button type="button" class="table-action" @click="selectGroup(group)">全选 / 取消</button></legend><label v-for="page in permissionPages.filter(item => item.group === group)" :key="page.id"><input v-model="editing.permissions" type="checkbox" :value="page.id" :disabled="locked(page.id)">{{ page.name }}</label></fieldset></div><p v-if="error" class="settings-error settings-form-wide" role="alert">{{ error }}</p></div><footer><button type="button" :disabled="busy" @click="close">取消</button><button class="primary" :disabled="busy || !editing.name || !editing.permissions.length">{{ busy?'保存中…':'保存角色' }}</button></footer></form></div>
  </section>
</template>
