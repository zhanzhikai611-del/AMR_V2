import { http } from '../http'
import type { BehaviorTreeDefinition } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getBehaviorTrees(): Promise<BehaviorTreeDefinition[]> {
  if (useMock) return structuredClone((await import('../../../mock/data/behaviors')).behaviorTrees)
  return (await http.get<{ data: BehaviorTreeDefinition[] }>('/behavior-trees')).data.data
}

export async function getBehaviorTree(id: string): Promise<BehaviorTreeDefinition> {
  if (useMock) {
    const tree = (await import('../../../mock/data/behaviors')).behaviorTrees.find((item) => item.id === id)
    if (!tree) throw new Error('Behavior tree not found')
    return structuredClone(tree)
  }
  return (await http.get<{ data: BehaviorTreeDefinition }>(`/behavior-trees/${id}`)).data.data
}

export async function updateBehaviorTreeBindings(id: string, amrIds: string[]): Promise<string[]> {
  if (useMock) {
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    return structuredClone(amrIds)
  }
  return (await http.put<{ data: { amrIds: string[] } }>(`/behavior-trees/${id}/amr-bindings`, { amrIds })).data.data.amrIds
}
