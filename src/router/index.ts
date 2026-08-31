import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import DigitalTwinView from '../views/DigitalTwinView.vue'
import TaskRecordsView from '../views/TaskRecordsView.vue'
import BehaviorTreesView from '../views/BehaviorTreesView.vue'
import ResourceManagementView from '../views/ResourceManagementView.vue'
import ResourceDetailView from '../views/ResourceDetailView.vue'
import BehaviorEditorView from '../views/BehaviorEditorView.vue'
import MapLibraryView from '../views/MapLibraryView.vue'
import MapEditorView from '../views/MapEditorView.vue'
import UsersSettingsView from '../views/settings/UsersSettingsView.vue'
import RolesSettingsView from '../views/settings/RolesSettingsView.vue'
import LogsSettingsView from '../views/settings/LogsSettingsView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'digital-twin', component: DigitalTwinView, meta: { menuId: 'twin', roles: ['只读用户','研发人员'] } },
        { path: 'analytics', name: 'analytics', component: AnalyticsView, meta: { menuId: 'analytics', roles: ['只读用户','研发人员'] } },
        { path: 'task-records', name: 'task-records', component: TaskRecordsView, meta: { menuId: 'records', roles: ['研发人员'] } },
        { path: 'behaviors', name: 'behaviors', component: BehaviorTreesView, meta: { menuId: 'behavior', roles: ['研发人员'] } },
        { path: 'behaviors/:id/edit', component: BehaviorEditorView, meta: { menuId: 'behavior', roles: ['研发人员'] } },
        { path: 'resources/amrs', component: ResourceManagementView, props: { section: 'amrs' }, meta: { groupId: 'resources', menuId: 'amrs', roles: ['研发人员'] } },
        { path: 'resources/amrs/:id', component: ResourceDetailView, props: { kind: 'amr' }, meta: { groupId: 'resources', menuId: 'amrs', roles: ['研发人员'] } },
        { path: 'resources/amr-models', component: ResourceManagementView, props: { section: 'amr-models' }, meta: { groupId: 'resources', menuId: 'amr-models', roles: ['研发人员'] } },
        { path: 'resources/devices', component: ResourceManagementView, props: { section: 'devices' }, meta: { groupId: 'resources', menuId: 'devices', roles: ['研发人员'] } },
        { path: 'resources/devices/:id', component: ResourceDetailView, props: { kind: 'device' }, meta: { groupId: 'resources', menuId: 'devices', roles: ['研发人员'] } },
        { path: 'resources/device-types', component: ResourceManagementView, props: { section: 'device-types' }, meta: { groupId: 'resources', menuId: 'device-types', roles: ['研发人员'] } },
        { path: 'maps', component: MapLibraryView, meta: { menuId: 'maps', roles: ['研发人员'] } },
        { path: 'maps/:id/edit', component: MapEditorView, meta: { menuId: 'maps', roles: ['研发人员'] } },
        { path: 'resources/maps', redirect: '/maps' },
        { path: 'resources/maps/:id/edit', redirect: (route) => `/maps/${route.params.id}/edit` },
        { path:'settings/users',component:UsersSettingsView,meta:{groupId:'settings',menuId:'users',roles:['系统管理员']} },
        { path:'settings/roles',component:RolesSettingsView,meta:{groupId:'settings',menuId:'roles',roles:['系统管理员']} },
        { path:'settings/dictionaries',redirect:'/settings/users' },
        { path:'settings/operation-logs',redirect:'/settings/system-logs?tab=audit' },
        { path:'settings/system-logs',component:LogsSettingsView,meta:{groupId:'settings',menuId:'system-logs',roles:['系统管理员']} },
      ],
    },
  ],
})
