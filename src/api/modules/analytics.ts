import { http } from '../http'
import type { AmrAnalytics, AnalyticsQuery, GlobalAnalytics } from '../../types/analytics'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getGlobalAnalytics(query: AnalyticsQuery): Promise<GlobalAnalytics> {
  if (useMock) {
    const { createGlobalAnalytics } = await import('../../../mock/data/analytics')
    return structuredClone(createGlobalAnalytics(query))
  }
  return (await http.get<{ data: GlobalAnalytics }>('/analytics/overview', { params: query })).data.data
}

export async function getAmrAnalytics(amrId: string, query: AnalyticsQuery): Promise<AmrAnalytics> {
  if (useMock) {
    const { createAmrAnalytics } = await import('../../../mock/data/analytics')
    return structuredClone(createAmrAnalytics(amrId, query))
  }
  return (await http.get<{ data: AmrAnalytics }>(`/analytics/amrs/${amrId}`, { params: query })).data.data
}
