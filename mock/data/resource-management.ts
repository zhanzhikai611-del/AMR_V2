import type { AmrModel, DeviceType, MapDefinition } from '../../src/types/domain'

export const amrModels: AmrModel[] = [
  { id: 'LP-200', chassis: '差速驱动', maxSpeed: '1.50 m/s', maxAngularSpeed: '1.20 rad/s', acceleration: '0.60 m/s²', arrivalThreshold: '0.10 m', lookaheadDistance: '1.80 m', enabled: true },
  { id: 'OMNI-300', chassis: '全向驱动', maxSpeed: '1.20 m/s', maxAngularSpeed: '1.50 rad/s', acceleration: '0.50 m/s²', arrivalThreshold: '0.08 m', lookaheadDistance: '1.50 m', enabled: true },
  { id: 'SW-500', chassis: '舵轮', maxSpeed: '2.00 m/s', maxAngularSpeed: '0.80 rad/s', acceleration: '0.70 m/s²', arrivalThreshold: '0.15 m', lookaheadDistance: '2.20 m', enabled: true },
]

export const deviceTypes: DeviceType[] = [
  { id: 'CNC', name: 'CNC 机台', pointRequirement: '服务点位', statusCount: 8, enabled: true },
  { id: 'HOME', name: 'HOME 待命站', pointRequirement: '待命点位', statusCount: 4, enabled: true },
]

export const mapDefinitions: MapDefinition[] = [
  { id: 'MAP-A', name: '装配物流区', floor: '2F', source: 'AMR 扫描', status: '已发布', runtimeVersion: 'V1.8', editVersion: 'V1.9 草稿', updatedAt: '08-15 10:40', current: true },
  { id: 'MAP-B', name: 'CNC 二号线测试区', floor: '1F', source: '文件导入', status: '草稿', runtimeVersion: '—', editVersion: 'V0.4', updatedAt: '08-12 16:12', current: false },
  { id: 'MAP-C', name: '空白联调区域', floor: '2F', source: '空白创建', status: '空白', runtimeVersion: '—', editVersion: 'V0.1', updatedAt: '08-09 14:35', current: false },
]
