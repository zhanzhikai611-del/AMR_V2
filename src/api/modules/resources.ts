import { http } from '../http'
import type { ResourceCatalog } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getResourceCatalog(): Promise<ResourceCatalog> {
  if (useMock) {
    const [{ twinSnapshot }, { amrModels, deviceTypes, mapDefinitions }] = await Promise.all([
      import('../../../mock/data/operations'),
      import('../../../mock/data/resource-management'),
    ])
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    return structuredClone({
      amrs: twinSnapshot.amrs,
      devices: twinSnapshot.resources.filter((item) => item.type === 'machine' || item.type === 'home'),
      models: amrModels,
      deviceTypes,
      maps: mapDefinitions,
    })
  }

  const response = await http.get<{ data: ResourceCatalog }>('/resources/catalog')
  return response.data.data
}
