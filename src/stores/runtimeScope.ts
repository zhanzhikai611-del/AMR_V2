import { defineStore } from 'pinia'

export interface RuntimeScope { id:string; label:string; floor:string; area:string }

export const useRuntimeScopeStore = defineStore('runtime-scope', {
  state: () => ({
    current: { id:'SCOPE-2F-ASSEMBLY', label:'2F · 装配物流区', floor:'2F', area:'装配物流区' } as RuntimeScope,
    available: [{ id:'SCOPE-2F-ASSEMBLY', label:'2F · 装配物流区', floor:'2F', area:'装配物流区' }] as RuntimeScope[],
  }),
  actions: { select(scopeId:string) { const next=this.available.find(scope=>scope.id===scopeId); if(next) this.current=next } },
})
