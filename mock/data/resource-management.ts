import type { AmrModel, DeviceType, MapDefinition } from '../../src/types/domain'

export const amrModels: AmrModel[] = [
  { id: 'LP-200', chassis: '差速驱动', maxSpeed: '1.50 m/s', maxAngularSpeed: '1.20 rad/s', acceleration: '0.60 m/s²', arrivalThreshold: '0.10 m', lookaheadDistance: '1.80 m', enabled: true },
  { id: 'OMNI-300', chassis: '全向驱动', maxSpeed: '1.20 m/s', maxAngularSpeed: '1.50 rad/s', acceleration: '0.50 m/s²', arrivalThreshold: '0.08 m', lookaheadDistance: '1.50 m', enabled: true },
  { id: 'SW-500', chassis: '舵轮', maxSpeed: '2.00 m/s', maxAngularSpeed: '0.80 rad/s', acceleration: '0.70 m/s²', arrivalThreshold: '0.15 m', lookaheadDistance: '2.20 m', enabled: true },
]

export const deviceTypes: DeviceType[] = [
  { id: 'CNC', name: 'CNC 机台', pointRequirement: '服务点位', statusCount: 8, enabled: true },
]

export const mapDefinitions: MapDefinition[] = [
  { id:'MAP-A-V18', name:'装配物流区', floor:'2F', source:'AMR-02 上传', status:'已发布', runtimeVersion:'V1.8', editVersion:'—', updatedAt:'08-17 09:20', current:true, project:'当前运行范围', resourceSummary:'6 AMR · 14 设备', objectSummary:'31 路线 · 30 点位', owner:'系统发布', scopeId:'SCOPE-2F-ASSEMBLY', scopeLabel:'2F · 装配物流区', mapVersion:'V1.8', uploadVehicle:'AMR-02' },
  { id:'MAP-A-V19-03', name:'装配物流区', floor:'2F', source:'AMR-03 上传', status:'草稿', runtimeVersion:'V1.8', editVersion:'V1.9 草稿', updatedAt:'今日 14:36', current:false, project:'当前运行范围', resourceSummary:'6 AMR · 14 设备', objectSummary:'34 路线 · 30 点位', owner:'张凯', scopeId:'SCOPE-2F-ASSEMBLY', scopeLabel:'2F · 装配物流区', mapVersion:'V1.9', uploadVehicle:'AMR-03' },
  { id:'MAP-A-V19-06', name:'装配物流区', floor:'2F', source:'AMR-06 上传', status:'草稿', runtimeVersion:'V1.8', editVersion:'V1.9 对比稿', updatedAt:'今日 13:52', current:false, project:'当前运行范围', resourceSummary:'6 AMR · 14 设备', objectSummary:'32 路线 · 30 点位', owner:'林工', scopeId:'SCOPE-2F-ASSEMBLY', scopeLabel:'2F · 装配物流区', mapVersion:'V1.9', uploadVehicle:'AMR-06' },
]
