<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { useLayoutStore } from '../stores/layout'
import { useRuntimeScopeStore } from '../stores/runtimeScope'

const layout = useLayoutStore()
const route = useRoute()
const runtimeScope = useRuntimeScopeStore()
const scopeOpen = ref(false)
const accountOpen = ref(false)
const logoutConfirming = ref(false)
const scopeEntry = ref<HTMLElement | null>(null)

const navigation = [
  { id: 'twin', label: '实时监控', icon: 'twin', route: '/' },
  { id: 'analytics', label: '数据分析', icon: 'analytics', route: '/analytics' },
  { id: 'records', label: '派单中心', icon: 'records', route: '/task-records' },
  { id: 'behavior', label: '行为树管理', icon: 'behavior', route: '/behaviors' },
  { id: 'maps', label: '地图管理', icon: 'layers', route: '/maps' },
  { id: 'resources', label: '资源管理', icon: 'resources', children: [
    { id: 'devices', label: '设备管理', route: '/resources/devices' },
    { id: 'device-relations', label: '设备关联管理', route: '/resources/device-relations' },
  ] },
  { id: 'settings', label: '系统设置', icon: 'settings', children: [
    { id: 'users', label: '用户管理', route: '/settings/users' },
    { id: 'roles', label: '角色权限', route: '/settings/roles' },
    { id: 'system-logs', label: '系统日志', route: '/settings/system-logs' },
  ] },
]

const activeGroup = computed(() => route.meta.groupId as string | undefined)
const isWorkbench = computed(() => route.path.startsWith('/maps/') && route.path.endsWith('/edit'))

onMounted(() => {
  if (activeGroup.value === 'resources' || activeGroup.value === 'settings') {
    layout.expandedGroup = activeGroup.value
  }
  document.addEventListener('pointerdown', closeScopeOutside)
  document.addEventListener('keydown', closeScopeOnEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeScopeOutside)
  document.removeEventListener('keydown', closeScopeOnEscape)
})
function closeScopeOutside(event: PointerEvent) { if (scopeEntry.value && !scopeEntry.value.contains(event.target as Node)) scopeOpen.value = false }
function closeScopeOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  scopeOpen.value = false
  accountOpen.value = false
  logoutConfirming.value = false
}
function selectScope(id: string) { runtimeScope.select(id); scopeOpen.value = false }
function openAccount() { scopeOpen.value = false; logoutConfirming.value = false; accountOpen.value = true }
function closeAccount() { accountOpen.value = false; logoutConfirming.value = false }
function logout() { accountOpen.value = false; logoutConfirming.value = false }
</script>

<template>
  <div class="app-shell" :class="{ 'navigation-collapsed': layout.navigationCollapsed, 'workbench-mode': isWorkbench }">
    <aside class="app-navigation" aria-label="主导航">
      <div class="brand-lockup">
        <span class="brand-symbol"><i></i><i></i><i></i></span>
        <span class="brand-text"><strong>FXXXXXN</strong><small>AMR CONTROL</small></span>
      </div>

      <nav class="navigation-list">
        <template v-for="item in navigation" :key="item.id">
          <RouterLink
            v-if="item.route"
            :to="item.route"
            class="navigation-item"
            :class="{ 'is-active': item.route === '/' ? route.path === '/' : route.path.startsWith(item.route) }"
            :title="layout.navigationCollapsed ? item.label : undefined"
          >
            <AppIcon :name="item.icon" />
            <span>{{ item.label }}</span>
          </RouterLink>
          <div v-else class="navigation-group" :class="{ expanded: layout.expandedGroup === item.id, active: activeGroup === item.id }">
            <button
              class="navigation-item group-trigger"
              type="button"
              :title="layout.navigationCollapsed ? item.label : undefined"
              @click="layout.toggleGroup(item.id as 'resources' | 'settings')"
            >
              <AppIcon :name="item.icon" />
              <span>{{ item.label }}</span>
              <AppIcon class="group-chevron" name="chevron" :size="15" />
            </button>
            <div class="navigation-children">
              <RouterLink v-for="child in item.children" :key="child.id" :to="child.route">
                {{ child.label }}
              </RouterLink>
            </div>
          </div>
        </template>
      </nav>

      <div class="navigation-footer">
        <div class="footer-utility-group">
        <div ref="scopeEntry" class="navigation-scope">
          <button type="button" class="navigation-scope__trigger" :class="{ active: scopeOpen }" :title="`当前工作范围：${runtimeScope.current.label}`" :aria-expanded="scopeOpen" @click="scopeOpen = !scopeOpen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2M8 14h2m4 0h2M9 21v-3h6v3"/></svg>
            <span><small>当前楼层</small><strong>{{ runtimeScope.current.label }}</strong></span>
            <AppIcon class="navigation-scope__chevron" name="chevron" :size="14" />
          </button>
          <Transition name="scope-flyout">
            <div v-if="scopeOpen" class="navigation-scope__modal" @click.self="scopeOpen = false">
            <section class="navigation-scope__panel" role="dialog" aria-modal="true" aria-label="选择当前楼层">
              <header><div><span>FLOOR SCOPE</span><strong>选择当前楼层</strong></div><button type="button" aria-label="关闭楼层选择" @click="scopeOpen = false">×</button></header>
              <div class="scope-current-summary"><small>当前楼层</small><strong>{{ runtimeScope.current.label }}</strong></div>
              <div class="scope-option-heading"><span>可用楼层</span></div>
              <div class="scope-option-list"><button v-for="scope in runtimeScope.available" :key="scope.id" :class="{ current: scope.id === runtimeScope.current.id }" @click="selectScope(scope.id)"><span><strong>{{ scope.label }}</strong></span><i>{{ scope.id === runtimeScope.current.id ? '✓' : '›' }}</i></button></div>
            </section>
            </div>
          </Transition>
        </div>
        <button type="button" class="operator-entry" :class="{ active: accountOpen }" title="当前用户：研发管理员" :aria-expanded="accountOpen" @click="openAccount">
          <span class="operator-entry__avatar">研</span>
          <span class="operator-entry__copy"><strong>研发管理员</strong><small>账号与退出</small></span>
          <AppIcon class="operator-entry__chevron" name="chevron" :size="14" />
        </button>
        <Transition name="scope-flyout">
          <div v-if="accountOpen" class="account-modal" @click.self="closeAccount">
            <section class="account-panel" role="dialog" aria-modal="true" aria-label="账号与退出">
              <header><div><span>ACCOUNT</span><strong>{{ logoutConfirming ? '确认退出登录' : '账号与退出' }}</strong></div><button type="button" aria-label="关闭账号弹窗" @click="closeAccount">×</button></header>
              <template v-if="!logoutConfirming">
                <div class="account-identity"><span class="account-identity__avatar">研</span><div><small>当前登录账号</small><strong>研发管理员</strong></div></div>
                <dl class="account-details"><div><dt>账号</dt><dd>rd_admin</dd></div><div><dt>角色</dt><dd>系统管理员</dd></div></dl>
                <footer><button type="button" class="account-logout" @click="logoutConfirming = true"><span>退出登录</span><small>结束当前账号会话</small><b>›</b></button></footer>
              </template>
              <template v-else>
                <div class="logout-confirm"><span class="logout-confirm__icon">↪</span><strong>确定要退出当前账号吗？</strong><p>退出后将返回登录页面，未保存的页面操作不会保留。</p></div>
                <footer class="logout-actions"><button type="button" @click="logoutConfirming = false">取消</button><button type="button" class="danger" @click="logout">退出登录</button></footer>
              </template>
            </section>
          </div>
        </Transition>
        </div>
        <button type="button" class="collapse-button" @click="layout.toggleNavigation">
          <AppIcon name="panel" />
          <span>{{ layout.navigationCollapsed ? '展开导航' : '收起导航' }}</span>
        </button>
        <div class="version-copy"><span>UI VERSION</span><b>0.1.0</b></div>
      </div>
    </aside>
    <main class="app-workspace">
      <RouterView />
    </main>
  </div>
</template>
