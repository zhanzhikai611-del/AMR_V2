import { http } from '../http'
import { permissionPages } from '../../features/settings/permissions'
import type { DictionaryItem, SystemLog, SystemRole, SystemUser } from '../../types/settings'
export const settingsDemoMode = import.meta.env.VITE_USE_MOCK !== 'false'
const storageKey = 'amr.settings.v1'
type SettingsData = { users: SystemUser[]; roles: SystemRole[] }
async function readData(): Promise<SettingsData> {
  const saved = localStorage.getItem(storageKey)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (Array.isArray(data.users) && Array.isArray(data.roles)) return data
    } catch { /* Fall back to the initial demonstration data. */ }
  }
  const seed = await import('../../../mock/data/settings')
  return structuredClone({ users: seed.systemUsers, roles: seed.systemRoles })
}
function commit(data: SettingsData) {
  localStorage.setItem(storageKey, JSON.stringify(data))
}
export async function getSystemUsers():Promise<SystemUser[]> { return settingsDemoMode ? (await readData()).users : (await http.get<{data:SystemUser[]}>('/settings/users')).data.data }
export async function getSystemRoles():Promise<SystemRole[]> { return settingsDemoMode ? (await readData()).roles : (await http.get<{data:SystemRole[]}>('/settings/roles')).data.data }
export async function getDictionaryItems():Promise<DictionaryItem[]> { return settingsDemoMode ? structuredClone((await import('../../../mock/data/settings')).dictionaryItems) : (await http.get<{data:DictionaryItem[]}>('/settings/dictionaries')).data.data }
export async function getSystemLogs():Promise<SystemLog[]> { return settingsDemoMode ? structuredClone((await import('../../../mock/data/settings')).systemLogs) : (await http.get<{data:SystemLog[]}>('/settings/system-logs')).data.data }
function isValidLoginIp(value: string) {
  if (value.includes(':')) {
    try { return !/[\[\]\s/%]/.test(value) && new URL(`http://[${value}]/`).hostname.startsWith('[') } catch { return false }
  }
  return /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) && value.split('.').every(part => Number(part) <= 255)
}
export async function saveSystemUser(user: SystemUser, original = '') {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$/.test(user.username)) throw new Error('工号需为 1–40 位字母、数字、点、下划线或短横线。')
  if (!user.name.trim() || user.name.length > 40) throw new Error('请输入 1–40 字的用户昵称。')
  if (original && original !== user.username) throw new Error('工号不可修改。')
  if ((user.departmentCode?.length ?? 0) > 40 || (user.departmentName?.length ?? 0) > 80) throw new Error('部门代码最多 40 字，部门名称最多 80 字。')
  if (user.email && (user.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))) throw new Error('请输入有效的邮箱地址。')
  if (user.loginIp && !isValidLoginIp(user.loginIp)) throw new Error('请输入有效的 IPv4 或 IPv6 地址。')
  if (!settingsDemoMode) {
    if (original) await http.put(`/settings/users/${encodeURIComponent(original)}`, user)
    else await http.post('/settings/users', user)
    return
  }
  const data = await readData()
  if (!data.roles.some(role => role.name === user.role)) throw new Error('所选角色不存在，请刷新后重试。')
  const index = data.users.findIndex(item => item.username === original)
  if (original && index < 0) throw new Error('用户不存在，请刷新后重试。')
  if (data.users.some(item => item.username.toLowerCase() === user.username.toLowerCase() && item.username !== original)) throw new Error('该工号已存在。')
  const previous = data.users[index]
  if (previous?.role === '系统管理员' && previous.status === '启用' && (user.role !== '系统管理员' || user.status !== '启用') && !data.users.some(item => item.username !== original && item.role === '系统管理员' && item.status === '启用')) throw new Error('至少保留一个启用的系统管理员账号。')
  if (index < 0) data.users.push({ ...user })
  else data.users[index] = { ...user }
  commit(data)
}
export async function deleteSystemUser(username: string) {
  if (!settingsDemoMode) { await http.delete(`/settings/users/${encodeURIComponent(username)}`); return }
  const data = await readData()
  const user = data.users.find(item => item.username === username)
  if (!user) throw new Error('用户不存在，请刷新后重试。')
  if (user.role === '系统管理员' && user.status === '启用' && !data.users.some(item => item.username !== username && item.role === '系统管理员' && item.status === '启用')) throw new Error('至少保留一个启用的系统管理员账号。')
  data.users = data.users.filter(item => item.username !== username)
  commit(data)
}
export async function saveSystemRole(role: SystemRole, original = '') {
  if (!role.name.trim() || role.name.length > 24) throw new Error('角色名称需为 1–24 字。')
  if (role.summary.length > 160) throw new Error('角色说明最多 160 字。')
  if (!role.permissions.length || role.permissions.some(id => !permissionPages.some(page => page.id === id))) throw new Error('请至少选择一个有效的页面权限。')
  if (!settingsDemoMode) {
    if (original) await http.put(`/settings/roles/${encodeURIComponent(original)}`, role)
    else await http.post('/settings/roles', role)
    return
  }
  const data = await readData()
  const index = data.roles.findIndex(item => item.name === original)
  if (original && index < 0) throw new Error('角色不存在，请刷新后重试。')
  if (data.roles.some(item => item.name.toLowerCase() === role.name.toLowerCase() && item.name !== original)) throw new Error('该角色名称已存在。')
  const previous = data.roles[index]
  if (previous?.builtin && role.name !== original) throw new Error('默认角色不可重命名。')
  if (original === '系统管理员' && ['users','roles','system-logs'].some(id => !role.permissions.includes(id))) throw new Error('系统管理员必须保留系统设置权限。')
  const next = { ...role, builtin: previous?.builtin ?? false, permissions: [...new Set(role.permissions)] }
  if (index < 0) data.roles.push(next)
  else data.roles[index] = next
  data.users.forEach(user => { if (user.role === original) user.role = role.name })
  commit(data)
}
export async function deleteSystemRole(name: string) {
  if (!settingsDemoMode) { await http.delete(`/settings/roles/${encodeURIComponent(name)}`); return }
  const data = await readData()
  const role = data.roles.find(item => item.name === name)
  if (!role) throw new Error('角色不存在，请刷新后重试。')
  if (data.users.some(user => user.role === name)) throw new Error('角色下仍有用户，请先调整用户角色。')
  data.roles = data.roles.filter(item => item.name !== name)
  commit(data)
}
