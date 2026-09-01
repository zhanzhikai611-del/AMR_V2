<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { useLayoutStore } from '../stores/layout'

const layout = useLayoutStore()
const route = useRoute()

const navigation = [
  { id: 'twin', label: '实时监控', icon: 'twin', route: '/' },
  { id: 'analytics', label: '数据分析', icon: 'analytics', route: '/analytics' },
  { id: 'records', label: '派单中心', icon: 'records', route: '/task-records' },
  { id: 'behavior', label: '行为树管理', icon: 'behavior', route: '/behaviors' },
  { id: 'maps', label: '地图管理', icon: 'layers', route: '/maps' },
  { id: 'settings', label: '系统设置', icon: 'settings', children: [
    { id: 'users', label: '用户管理', route: '/settings/users' },
    { id: 'roles', label: '角色权限', route: '/settings/roles' },
    { id: 'system-logs', label: '系统日志', route: '/settings/system-logs' },
  ] },
]

const activeGroup = computed(() => route.meta.groupId as string | undefined)
const isWorkbench = computed(() => route.path.startsWith('/maps/') && route.path.endsWith('/edit'))

onMounted(() => {
  if (activeGroup.value === 'settings') {
    layout.expandedGroup = activeGroup.value
  }
})
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
              @click="layout.toggleGroup(item.id as 'settings')"
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
        <button type="button" class="operator-entry" title="当前用户：研发管理员">
          <span class="operator-entry__avatar">研</span>
          <span class="operator-entry__copy"><strong>研发管理员</strong><small>账号与退出</small></span>
          <AppIcon class="operator-entry__chevron" name="chevron" :size="14" />
        </button>
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
