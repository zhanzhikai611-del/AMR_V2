<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { useLayoutStore } from '../stores/layout'
import { useMonitorContextStore } from '../stores/monitor-context'

const layout = useLayoutStore()
const route = useRoute()
const monitor = useMonitorContextStore()
const scopeOpen = ref(false)

const navigation = [
  { id: 'twin', label: '实时监控', icon: 'twin', route: '/' },
  { id: 'records', label: '任务管理', icon: 'records', route: '/task-records' },
  { id: 'behavior', label: '行为树管理', icon: 'behavior', route: '/behaviors' },
  { id: 'maps', label: '地图管理', icon: 'layers', route: '/maps' },
  { id: 'resources', label: '资源管理', icon: 'resources', children: [
    { id: 'amrs', label: 'AMR 列表', route: '/resources/amrs' },
    { id: 'amr-models', label: 'AMR 型号', route: '/resources/amr-models' },
    { id: 'devices', label: '设备列表', route: '/resources/devices' },
    { id: 'device-types', label: '设备类型', route: '/resources/device-types' },
  ] },
  { id: 'settings', label: '系统设置', icon: 'settings', children: [
    { id: 'users', label: '用户管理', route: '/settings/users' },
    { id: 'roles', label: '角色权限', route: '/settings/roles' },
    { id: 'configurations', label: '配置管理', route: '/settings/configurations' },
    { id: 'dictionaries', label: '数据字典', route: '/settings/dictionaries' },
    { id: 'operation-logs', label: '操作日志', route: '/settings/operation-logs' },
    { id: 'system-logs', label: '系统日志', route: '/settings/system-logs' },
  ] },
]

const activeGroup = computed(() => route.meta.groupId as string | undefined)

onMounted(() => {
  if (activeGroup.value === 'resources' || activeGroup.value === 'settings') {
    layout.expandedGroup = activeGroup.value
  }
  if (!monitor.snapshot) void monitor.loadSnapshot()
})
</script>

<template>
  <div class="app-shell" :class="{ 'navigation-collapsed': layout.navigationCollapsed }">
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
        <div class="scope-entry-wrap">
          <button
            type="button"
            class="scope-entry"
            :class="{ active: scopeOpen }"
            :title="layout.navigationCollapsed ? `运行范围：${monitor.snapshot?.scope ?? '加载中'}` : undefined"
            @click="scopeOpen = !scopeOpen"
          >
            <AppIcon name="layers" />
            <span><small>运行范围</small><strong>{{ monitor.snapshot?.scope ?? '加载中' }}</strong></span>
            <AppIcon class="scope-entry__chevron" name="chevron" :size="14" />
          </button>
          <div v-if="scopeOpen" class="scope-popover">
            <small>当前运行范围</small>
            <button type="button" class="selected"><i></i><span><strong>{{ monitor.snapshot?.scope ?? '加载中' }}</strong><small>当前地图 · {{ monitor.snapshot?.amrs.length ?? 0 }} 台 AMR</small></span><b>✓</b></button>
          </div>
        </div>
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
