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
const pendingScopeId = ref(runtimeScope.current.id)
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
}
function openScope() { pendingScopeId.value = runtimeScope.current.id; accountOpen.value = false; scopeOpen.value = true }
function confirmScope() { runtimeScope.select(pendingScopeId.value); scopeOpen.value = false }
function openAccount() { scopeOpen.value = false; accountOpen.value = true }
function closeAccount() { accountOpen.value = false }
function logout() { accountOpen.value = false }
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
        <div class="footer-utility-group footer-utility-group--separate">
        <div ref="scopeEntry" class="navigation-scope">
          <button type="button" class="navigation-scope__trigger" :class="{ active: scopeOpen }" :title="`当前工作范围：${runtimeScope.current.label}`" :aria-expanded="scopeOpen" @click="openScope">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2M8 14h2m4 0h2M9 21v-3h6v3"/></svg>
            <span><small>当前楼层</small><strong>{{ runtimeScope.current.label }}</strong></span>
            <AppIcon class="navigation-scope__chevron" name="chevron" :size="14" />
          </button>
          <Transition name="scope-flyout">
            <div v-if="scopeOpen" class="navigation-scope__modal" @click.self="scopeOpen = false">
            <section class="utility-dialog" role="dialog" aria-modal="true" aria-labelledby="floor-title">
              <header><h2 id="floor-title">切换楼层</h2><button type="button" aria-label="关闭" @click="scopeOpen = false">×</button></header>
              <div class="utility-dialog__body">
                <label for="floor-select">当前楼层</label>
                <select id="floor-select" v-model="pendingScopeId"><option v-for="scope in runtimeScope.available" :key="scope.id" :value="scope.id">{{ scope.label }}</option></select>
                <p>切换后，系统各页面将统一显示所选楼层的数据。</p>
              </div>
              <footer><button type="button" @click="scopeOpen = false">取消</button><button type="button" class="primary" :disabled="pendingScopeId === runtimeScope.current.id" @click="confirmScope">确认切换</button></footer>
            </section>
            </div>
          </Transition>
        </div>
        <button type="button" class="operator-entry" :class="{ active: accountOpen }" title="当前用户：研发管理员" :aria-expanded="accountOpen" @click="openAccount">
          <span class="operator-entry__avatar">研</span>
          <span class="operator-entry__copy"><strong>研发管理员</strong></span>
          <AppIcon class="operator-entry__chevron" name="chevron" :size="14" />
        </button>
        <Transition name="scope-flyout">
          <div v-if="accountOpen" class="account-modal" @click.self="closeAccount">
            <section class="utility-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title">
              <header><h2 id="logout-title">退出登录</h2><button type="button" aria-label="关闭" @click="closeAccount">×</button></header>
              <div class="utility-dialog__body"><strong>确定退出研发管理员账号？</strong><p>退出后需重新登录才能继续使用系统。</p></div>
              <footer><button type="button" @click="closeAccount">取消</button><button type="button" class="danger" @click="logout">退出登录</button></footer>
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

<style scoped>
.footer-utility-group--separate{background:transparent;border:0;overflow:visible}
.footer-utility-group--separate .navigation-scope{margin:0 0 10px;border:0}
.footer-utility-group--separate .navigation-scope__trigger{height:52px;background:#152630;border:1px solid #2c414d;border-radius:6px}
.footer-utility-group--separate .operator-entry{height:46px;min-height:46px;border-radius:6px;background:transparent}
.footer-utility-group--separate .operator-entry:hover{background:#192c37}
.utility-dialog{width:min(400px,calc(100vw - 48px));max-height:calc(100vh - 48px);overflow:auto;background:#fff;color:#304b59;border:1px solid #cbd8e0;border-radius:8px;box-shadow:0 20px 60px #05141d40}
.utility-dialog header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #e3eaf0}
.utility-dialog h2{margin:0;font:600 17px/24px var(--font-zh)}
.utility-dialog header button{width:28px;height:28px;background:transparent;color:#738792;font-size:23px;cursor:pointer}
.utility-dialog__body{padding:22px}
.utility-dialog__body label{display:block;margin-bottom:9px;font-size:12px;color:#657d8b}
.utility-dialog__body select{width:100%;height:40px;padding:0 12px;border:1px solid #b9cddc;border-radius:4px;background:#fff;color:#304b59;font:600 13px var(--font-latin)}
.utility-dialog__body strong{font:500 14px/22px var(--font-zh)}
.utility-dialog__body p{margin:12px 0 0;color:#7c8e98;font:400 12px/20px var(--font-zh)}
.utility-dialog footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;border-top:1px solid #e3eaf0;background:#f8fafb}
.utility-dialog footer button{min-width:72px;height:34px;padding:0 13px;border:1px solid #cbd8e0;border-radius:4px;background:#fff;color:#405663;cursor:pointer}
.utility-dialog footer .primary{background:#1677e8;border-color:#1677e8;color:#fff}
.utility-dialog footer .danger{background:#c95353;border-color:#c95353;color:#fff}
.utility-dialog footer button:disabled{opacity:.4;cursor:not-allowed}
.utility-dialog button:focus-visible,.utility-dialog select:focus-visible{outline:2px solid #5ca4e8;outline-offset:2px}
</style>
