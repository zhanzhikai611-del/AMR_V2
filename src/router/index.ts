import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import DigitalTwinView from '../views/DigitalTwinView.vue'
import TaskRecordsView from '../views/TaskRecordsView.vue'
import BehaviorTreesView from '../views/BehaviorTreesView.vue'
import SectionPlaceholderView from '../views/SectionPlaceholderView.vue'
import ResourceManagementView from '../views/ResourceManagementView.vue'
import ResourceDetailView from '../views/ResourceDetailView.vue'
import BehaviorEditorView from '../views/BehaviorEditorView.vue'
import MapLibraryView from '../views/MapLibraryView.vue'
import MapEditorView from '../views/MapEditorView.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'digital-twin', component: DigitalTwinView, meta: { menuId: 'twin' } },
        { path: 'task-records', name: 'task-records', component: TaskRecordsView, meta: { menuId: 'records' } },
        { path: 'behaviors', name: 'behaviors', component: BehaviorTreesView, meta: { menuId: 'behavior' } },
        { path: 'behaviors/:id/edit', component: BehaviorEditorView, meta: { menuId: 'behavior' } },
        { path: 'resources/amrs', component: ResourceManagementView, props: { section: 'amrs' }, meta: { groupId: 'resources', menuId: 'amrs' } },
        { path: 'resources/amrs/:id', component: ResourceDetailView, props: { kind: 'amr' }, meta: { groupId: 'resources', menuId: 'amrs' } },
        { path: 'resources/amr-models', component: ResourceManagementView, props: { section: 'amr-models' }, meta: { groupId: 'resources', menuId: 'amr-models' } },
        { path: 'resources/devices', component: ResourceManagementView, props: { section: 'devices' }, meta: { groupId: 'resources', menuId: 'devices' } },
        { path: 'resources/devices/:id', component: ResourceDetailView, props: { kind: 'device' }, meta: { groupId: 'resources', menuId: 'devices' } },
        { path: 'resources/device-types', component: ResourceManagementView, props: { section: 'device-types' }, meta: { groupId: 'resources', menuId: 'device-types' } },
        { path: 'maps', component: MapLibraryView, meta: { menuId: 'maps' } },
        { path: 'maps/:id/edit', component: MapEditorView, meta: { menuId: 'maps' } },
        { path: 'resources/maps', redirect: '/maps' },
        { path: 'resources/maps/:id/edit', redirect: (route) => `/maps/${route.params.id}/edit` },
        { path: 'settings/:section', component: SectionPlaceholderView, props: (route) => ({ title: ({ users: '用户管理', roles: '角色权限', configurations: '配置管理', dictionaries: '数据字典', 'operation-logs': '操作日志', 'system-logs': '系统日志' } as Record<string, string>)[route.params.section as string] ?? '系统设置', description: '系统设置页面已建立路由，具体字段将在后续阶段完善。', eyebrow: '系统设置' }), meta: { groupId: 'settings' } },
      ],
    },
  ],
})
