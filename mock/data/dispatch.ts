import type { DispatchRule, DispatchSettings } from '../../src/types/domain'

export const dispatchSettings: DispatchSettings = {
  strategy: '先进先出',
  apsEnabled: false,
  updatedAt: '2026-08-19 08:30:00',
}

export const dispatchRules: DispatchRule[] = [
  { id: 'RULE-001', taskType: '紧急补料', strategy: '最短时间', apsEnabled: true, updatedAt: '2026-08-26 14:20:00' },
  { id: 'RULE-002', taskType: '成品转运', strategy: '先进先出', apsEnabled: false, updatedAt: '2026-08-25 09:45:00' },
  { id: 'RULE-003', taskType: '线边补料', strategy: '提前叫料', apsEnabled: true, updatedAt: '2026-08-25 09:42:00' },
  { id: 'RULE-004', taskType: '空箱回收', strategy: '最短距离', apsEnabled: false, updatedAt: '2026-08-23 16:08:00' },
  { id: 'RULE-005', taskType: '半成品转运', strategy: '负载均衡', apsEnabled: false, updatedAt: '2026-08-22 11:30:00' },
]
