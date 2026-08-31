import type { DispatchRule, DispatchSettings } from '../../src/types/domain'

export const dispatchSettings: DispatchSettings = {
  strategy: '先进先出',
  apsEnabled: false,
  updatedAt: '2026-08-19 08:30:00',
}

export const dispatchRules: DispatchRule[] = [
  { id: 'RULE-001', taskType: '设备补料', strategy: '提前叫料', defaultPriority: '高', apsEnabled: true, updatedAt: '2026-08-26 14:20:00' },
  { id: 'RULE-002', taskType: '设备下料', strategy: '最短距离', defaultPriority: '普通', apsEnabled: false, updatedAt: '2026-08-25 09:45:00' },
  { id: 'RULE-003', taskType: '成品转运', strategy: '先进先出', defaultPriority: '普通', apsEnabled: false, updatedAt: '2026-08-25 09:42:00' },
  { id: 'RULE-004', taskType: '半成品转运', strategy: '负载均衡', defaultPriority: '普通', apsEnabled: false, updatedAt: '2026-08-23 16:08:00' },
]
