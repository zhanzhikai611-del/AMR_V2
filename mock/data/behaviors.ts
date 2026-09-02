import type { BehaviorTreeDefinition } from '../../src/types/domain'

/** 单线上下料标准。限行区、互斥路段等通行权由导航节点根据路线在运行时处理。 */
const transferFlow = (prefix: string, toLoad: string, toUnload: string) => [
  { id: `${prefix}-root`, name: '上下料主序列', kind: 'sequence' as const, x: 420, y: 60 },
  { id: `${prefix}-to-load`, name: toLoad, kind: 'action' as const, x: 150, y: 190, parentId: `${prefix}-root` },
  { id: `${prefix}-load`, name: '执行上料', kind: 'action' as const, x: 330, y: 190, parentId: `${prefix}-root` },
  { id: `${prefix}-to-unload`, name: toUnload, kind: 'action' as const, x: 510, y: 190, parentId: `${prefix}-root` },
  { id: `${prefix}-unload`, name: '执行下料', kind: 'action' as const, x: 690, y: 190, parentId: `${prefix}-root` },
]

export const behaviorTrees: BehaviorTreeDefinition[] = [
  { id: 'BT-001', name: '设备补料', taskType: '设备补料', status: '已发布', updatedAt: '2026-08-29 13:40', nodeCount: 5, summary: '前往备料点 → 执行上料 → 前往目标设备 → 执行下料', boundAmrIds: ['AMR-01', 'AMR-02', 'AMR-04'], nodes: transferFlow('bt1', '前往备料点', '前往目标设备') },
  { id: 'BT-002', name: '设备下料', taskType: '设备下料', status: '已发布', updatedAt: '2026-08-29 13:40', nodeCount: 5, summary: '前往目标设备 → 执行上料 → 前往下料点 → 执行下料', boundAmrIds: ['AMR-03', 'AMR-05'], nodes: transferFlow('bt2', '前往目标设备', '前往下料点') },
  { id: 'BT-003', name: '成品转运', taskType: '成品转运', status: '已发布', updatedAt: '2026-08-29 13:40', nodeCount: 5, summary: '前往产出设备 → 执行上料 → 前往成品下料点 → 执行下料', boundAmrIds: ['AMR-02', 'AMR-03', 'AMR-06'], nodes: transferFlow('bt3', '前往产出设备', '前往成品下料点') },
  { id: 'BT-004', name: '半成品转运', taskType: '半成品转运', status: '草稿', updatedAt: '2026-08-29 13:40', nodeCount: 5, summary: '前往上游设备 → 执行上料 → 前往下游设备 → 执行下料', boundAmrIds: ['AMR-05', 'AMR-06'], nodes: transferFlow('bt4', '前往上游设备', '前往下游设备') },
]
