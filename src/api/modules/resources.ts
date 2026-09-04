import { http } from '../http'
import type { ResourceCatalog } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getResourceCatalog(): Promise<ResourceCatalog> {
  if (useMock) {
    const { twinSnapshot } = await import('../../../mock/data/operations')
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    return structuredClone({ amrs: twinSnapshot.amrs, devices: twinSnapshot.resources })
  }
  return (await http.get<{ data: ResourceCatalog }>('/resources/catalog')).data.data
}
