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
  { id: 'BT-001', kind: '行为树', name: '中转台-CNC-上料', taskType: '上料', status: '已发布', updatedAt: '2026-08-29 13:40', nodeCount: 5, summary: '从中转台取料并运送至 CNC', boundAmrIds: ['AMR-01', 'AMR-02', 'AMR-04'], nodes: transferFlow('bt1', '前往中转台', '前往 CNC') },
  { id: 'BT-002', kind: '行为树', name: 'CNC-中转台-下料', taskType: '下料', status: '已发布', updatedAt: '2026-08-29 13:40', nodeCount: 5, summary: '从 CNC 取料并运送至中转台', boundAmrIds: ['AMR-03', 'AMR-05'], nodes: transferFlow('bt2', '前往 CNC', '前往中转台') },
  { id: 'BT-003', kind: '行为树', name: 'CNC-CNC-上下料', taskType: '上下料', status: '已发布', updatedAt: '2026-08-29 13:40', nodeCount: 5, summary: '完成两台 CNC 之间的上下料转运', boundAmrIds: ['AMR-02', 'AMR-03', 'AMR-06'], nodes: transferFlow('bt3', '前往上游 CNC', '前往下游 CNC') },
  { id: 'BT-004', kind: '行为树', name: 'CNC-充电站-充电', taskType: '充电', status: '待发布', updatedAt: '2026-08-29 13:40', nodeCount: 5, summary: '从 CNC 区域前往充电站执行充电', boundAmrIds: ['AMR-05', 'AMR-06'], nodes: transferFlow('bt4', '离开 CNC', '前往充电站') },
  { id: 'ST-001', kind: '子树', name: '站点对接检查', taskType: '通用子流程', updatedAt: '2026-08-27 09:15', nodeCount: 3, summary: '检查站点状态并完成精确对接', nodes: transferFlow('st1', '检查站点状态', '执行精确对接').slice(0, 3) },
  { id: 'ST-002', kind: '子树', name: '异常复位流程', taskType: '通用子流程', updatedAt: '2026-08-25 16:30', nodeCount: 3, summary: '清除异常、设备复位并返回主流程', nodes: transferFlow('st2', '清除异常', '设备复位').slice(0, 3) },
]
