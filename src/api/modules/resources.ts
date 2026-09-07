import { http } from '../http'
import type { ResourceCatalog } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getResourceCatalog(): Promise<ResourceCatalog> {
  if (useMock) {
    const { twinSnapshot } = await import('../../../mock/data/operations')
    const { withRuntimeMap } = await import('../../../mock/data/runtime-map')
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    const snapshot = withRuntimeMap(twinSnapshot)
    return { amrs: snapshot.amrs, devices: snapshot.resources }
  }
  return (await http.get<{ data: ResourceCatalog }>('/resources/catalog')).data.data
}
