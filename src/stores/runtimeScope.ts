import { defineStore } from 'pinia'

export interface RuntimeScope { id:string; label:string; floor:string; area:string }

export const useRuntimeScopeStore = defineStore('runtime-scope', {
  state: () => ({
    current: { id:'SCOPE-C06-4F', label:'GL-C06-4F', floor:'4F', area:'C06' } as RuntimeScope,
    available: [{ id:'SCOPE-C06-4F', label:'GL-C06-4F', floor:'4F', area:'C06' }] as RuntimeScope[],
  }),
  actions: { select(scopeId:string) { const next=this.available.find(scope=>scope.id===scopeId); if(next) this.current=next } },
})
