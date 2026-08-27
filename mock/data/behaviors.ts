import type { BehaviorTreeDefinition } from '../../src/types/domain'

const flow = (prefix: string) => [
  { id: `${prefix}-root`, name: '任务主序列', kind: 'sequence' as const, x: 360, y: 70 },
  { id: `${prefix}-receive`, name: '接收设备请求', kind: 'condition' as const, x: 150, y: 190, parentId: `${prefix}-root` },
  { id: `${prefix}-dispatch`, name: '调度车辆', kind: 'action' as const, x: 360, y: 190, parentId: `${prefix}-root` },
  { id: `${prefix}-serve`, name: '执行设备服务', kind: 'action' as const, x: 570, y: 190, parentId: `${prefix}-root` },
]

export const behaviorTrees: BehaviorTreeDefinition[] = [
  { id: 'BT-001', name: 'CNC 成品转运', version: 'v2.4', taskType: '成品转运', status: '已发布', updatedAt: '2026-08-12 16:28', nodeCount: 11, kind: 'behavior', summary: '接收请求 → 调度车辆 → 取料 → 交付', references: '3 个任务类型', boundAmrIds: ['AMR-02', 'AMR-03', 'AMR-06'], nodes: flow('bt1') },
  { id: 'BT-002', name: '线边补料标准流程', version: 'v1.8', taskType: '线边补料', status: '已发布', updatedAt: '2026-08-08 11:06', nodeCount: 9, kind: 'behavior', summary: '检查请求 → 调度车辆 → 补料 → 确认', references: '2 个任务类型', boundAmrIds: ['AMR-01', 'AMR-02', 'AMR-04'], nodes: flow('bt2') },
  { id: 'BT-003', name: '空箱回收流程', version: 'v1.3', taskType: '空箱回收', status: '已发布', updatedAt: '2026-08-05 09:42', nodeCount: 8, kind: 'behavior', summary: '接收回收 → 前往设备 → 回收 → 结束', references: '1 个任务类型', boundAmrIds: ['AMR-03', 'AMR-05'], nodes: flow('bt3') },
  { id: 'BT-004', name: '半成品转运流程', version: 'v2.1', taskType: '半成品转运', status: '草稿', updatedAt: '2026-07-30 14:18', nodeCount: 10, kind: 'behavior', summary: '设备请求 → 车辆调度 → 转运 → 确认', references: '未引用', boundAmrIds: [], nodes: flow('bt4') },
  { id: 'ST-001', name: '标准取料单元', version: 'v1.2', taskType: '可复用流程', status: '已发布', updatedAt: '2026-08-10 10:08', nodeCount: 4, kind: 'subtree', summary: '设备就绪 → 对接 → 取料 → 载货确认', references: '3 棵行为树', nodes: flow('st1') },
  { id: 'ST-002', name: '缓冲区交付单元', version: 'v0.6', taskType: '可复用流程', status: '草稿', updatedAt: '2026-08-07 16:22', nodeCount: 4, kind: 'subtree', summary: '申请路权 → 校验放行 → 放料 → 确认', references: '2 棵行为树', nodes: flow('st2') },
  { id: 'ST-003', name: '安全回充单元', version: 'v1.0', taskType: '可复用流程', status: '已发布', updatedAt: '2026-08-03 18:05', nodeCount: 3, kind: 'subtree', summary: '检查电量 → 前往充电 → 对接充电桩', references: '1 棵行为树', nodes: flow('st3') },
]
