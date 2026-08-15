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
