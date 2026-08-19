export type Tone = 'running' | 'idle' | 'waiting' | 'charging' | 'fault' | 'success'

export interface Point {
  x: number
  y: number
}

export interface BehaviorStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'failure' | 'waiting' | 'skipped'
  duration: string
  detail?: string
}

export interface TimelineEvent {
  id: string
  time: string
  label: string
  type: 'task' | 'behavior' | 'traffic' | 'alarm'
  tone?: 'normal' | 'warning' | 'danger'
}

export interface Task {
  id: string
  type: string
  amrId: string | null
  requestDeviceId: string
  phase: string
  status: '待调度' | '运行中' | '等待中' | '异常'
  priority: '普通' | '高'
  duration: string
  progress: number
  behaviorName: string
  behaviorVersion: string
  behaviorSteps: BehaviorStep[]
  events: TimelineEvent[]
  plannedPath: string
  traveledPath: string
}

export interface Amr {
  id: string
  name: string
  ip: string
  model: string
  chassis: string
  initialPoint: string
  status: '执行中' | '空闲' | '等待' | '充电' | '故障'
  tone: Tone
  battery: number
  speed: number
  positionLabel: string
  position: Point
  taskId: string | null
  heading: number
  serviceDevices: string[]
  serviceStations: string[]
  supportedActions: string[]
  ratedLoad: string
  connectedAt: string
}

export interface MapResource {
  id: string
  type: 'machine' | 'buffer' | 'charge' | 'door' | 'home' | 'recycle'
  label: string
  position: Point
  state?: 'normal' | 'waiting' | 'fault'
  name?: string
  group?: string
  enabled?: boolean
  connected?: boolean
  boundPoint?: string
}

export interface MapTopology {
  columns: number[]
  rows: number[]
  paths: string[]
}

export interface TrafficZone {
  id: string
  label: string
  type: 'intersection' | 'mutex' | 'restricted'
  x: number
  y: number
  width: number
  height: number
  capacity: number
  status: 'available' | 'occupied' | 'waiting' | 'blocked'
  occupantId?: string
  waitingCount?: number
}

export interface TrafficSegment {
  id: string
  path: string
  status: 'clear' | 'occupied' | 'congested' | 'blocked'
  direction: 'one-way' | 'two-way'
  speedLimit: number
  occupantId?: string
  waitingCount?: number
}

export interface TwinSnapshot {
  updatedAt: string
  scope: string
  tasks: Task[]
  amrs: Amr[]
  resources: MapResource[]
  topology: MapTopology
  trafficZones: TrafficZone[]
  trafficSegments: TrafficSegment[]
  blockedSegments: number
  unconfirmedAlarms: number
}

export interface AmrModel {
  id: string
  chassis: string
  maxSpeed: string
  maxAngularSpeed: string
  acceleration: string
  arrivalThreshold: string
  lookaheadDistance: string
  enabled: boolean
}

export interface DeviceType {
  id: string
  name: string
  pointRequirement: string
  statusCount: number
  enabled: boolean
}

export interface MapDefinition {
  id: string
  name: string
  floor: string
  source: string
  status: '已发布' | '草稿' | '空白'
  runtimeVersion: string
  editVersion: string
  updatedAt: string
  current: boolean
  project?: string
  resourceSummary?: string
  objectSummary?: string
  owner?: string
  scopeId?: string
  scopeLabel?: string
  mapVersion?: string
  uploadVehicle?: string
}

export type MapEditorTool = 'select' | 'point' | 'resource' | 'route' | 'zone' | 'delete'
export type MapViewMode = 'scan' | 'logic' | 'overlay'
export interface MapPoint { id: string; x: number; y: number; type: '路网节点' | '等待点' }
export interface MapRoute { id: string; startId: string; endId: string; direction: string; speed: number }
export interface MapPlacedResource { id: string; resourceType: 'CNC' | 'HOME' | 'GATE' | 'BUF' | 'CHG'; pointId: string; x: number; y: number; approach: string }
export interface MapControlZone { id: string; x: number; y: number; width: number; height: number; type: string }
export interface MapEditorDraft {
  mapId: string
  version: string
  resolution: string
  points: MapPoint[]
  routes: MapRoute[]
  resources: MapPlacedResource[]
  zones: MapControlZone[]
}

export interface ResourceCatalog {
  amrs: Amr[]
  devices: MapResource[]
  models: AmrModel[]
  deviceTypes: DeviceType[]
  maps: MapDefinition[]
}

export interface TaskRecord {
  id: string
  type: string
  requestDeviceId: string
  amrId: string
  result: '已完成' | '已取消'
  requestedAt: string
  finishedAt: string
  duration: string
  behaviorName: string
  behaviorVersion: string
  summary: string
}

export interface DispatchSettings {
  strategy: '规则优先' | '距离优先' | '负载均衡' | 'APS 推荐'
  apsEnabled: boolean
  updatedAt: string
}

export interface BehaviorTreeDefinition {
  id: string
  name: string
  version: string
  taskType: string
  status: '已发布' | '草稿'
  updatedAt: string
  nodeCount: number
  kind: 'behavior' | 'subtree'
  summary: string
  references: string
  boundAmrIds?: string[]
  nodes: Array<{ id: string; name: string; kind: 'sequence' | 'action' | 'condition'; x: number; y: number; parentId?: string }>
}
