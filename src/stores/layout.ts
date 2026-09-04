import { defineStore } from 'pinia'

export const useLayoutStore = defineStore('layout', {
  state: () => ({
    navigationCollapsed: false,
    expandedGroup: null as 'resources' | 'settings' | null,
  }),
  actions: {
    toggleNavigation() {
      this.navigationCollapsed = !this.navigationCollapsed
    },
    toggleGroup(group: 'resources' | 'settings') {
      this.expandedGroup = this.expandedGroup === group ? null : group
    },
  },
})
