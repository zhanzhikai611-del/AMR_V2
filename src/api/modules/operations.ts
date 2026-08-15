import { http } from '../http'
import type { TwinSnapshot } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getTwinSnapshot(): Promise<TwinSnapshot> {
  if (useMock) {
    const { twinSnapshot } = await import('../../../mock/data/operations')
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    return structuredClone(twinSnapshot)
  }

  const response = await http.get<{ data: TwinSnapshot }>('/digital-twin/snapshot')
  return response.data.data
}
