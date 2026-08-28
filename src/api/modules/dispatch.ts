import { http } from '../http'
import type { DispatchRule, DispatchSettings } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export async function getDispatchSettings(): Promise<DispatchSettings> {
  if (useMock) {
    const { dispatchSettings } = await import('../../../mock/data/dispatch')
    return structuredClone(dispatchSettings)
  }
  return (await http.get<{ data: DispatchSettings }>('/dispatch/settings')).data.data
}

export async function updateDispatchSettings(settings: DispatchSettings): Promise<DispatchSettings> {
  if (useMock) return structuredClone(settings)
  return (await http.put<{ data: DispatchSettings }>('/dispatch/settings', settings)).data.data
}

export async function getDispatchRules(): Promise<DispatchRule[]> {
  if (useMock) {
    const { dispatchRules } = await import('../../../mock/data/dispatch')
    return structuredClone(dispatchRules)
  }
  return (await http.get<{ data: DispatchRule[] }>('/dispatch/rules')).data.data
}

export async function updateDispatchRule(rule: DispatchRule): Promise<DispatchRule> {
  if (useMock) return structuredClone(rule)
  return (await http.put<{ data: DispatchRule }>(`/dispatch/rules/${rule.id}`, rule)).data.data
}
