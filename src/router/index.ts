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
import ConfigurationsSettingsView from '../views/settings/ConfigurationsSettingsView.vue'
import DictionariesSettingsView from '../views/settings/DictionariesSettingsView.vue'
import LogsSettingsView from '../views/settings/LogsSettingsView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'digital-twin', component: DigitalTwinView, meta: { menuId: 'twin' } },
        { path: 'analytics', name: 'analytics', component: AnalyticsView, meta: { menuId: 'analytics' } },
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
        { path:'settings/users',component:UsersSettingsView,meta:{groupId:'settings',menuId:'users'} },
        { path:'settings/roles',component:RolesSettingsView,meta:{groupId:'settings',menuId:'roles'} },
        { path:'settings/configurations',component:ConfigurationsSettingsView,meta:{groupId:'settings',menuId:'configurations'} },
        { path:'settings/dictionaries',component:DictionariesSettingsView,meta:{groupId:'settings',menuId:'dictionaries'} },
        { path:'settings/operation-logs',component:LogsSettingsView,props:{kind:'operation'},meta:{groupId:'settings',menuId:'operation-logs'} },
        { path:'settings/system-logs',component:LogsSettingsView,props:{kind:'system'},meta:{groupId:'settings',menuId:'system-logs'} },
      ],
    },
  ],
})
