export type Tone = 'running' | 'idle' | 'charging' | 'fault' | 'disabled' | 'offline' | 'success'

export interface Point {
  x: number
  y: number
}

export interface BehaviorStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped'
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
  status: '运行中' | '异常'
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
  connectionStatus?: 'online' | 'offline'
  runnable?: boolean
  status: '运行' | '空闲' | '异常' | '离线' | '充电' | '停用'
  tone: Tone
  battery: number
  speed: number
  positionLabel: string
  position: Point
  taskId: string | null
  heading: number
  serviceDevices: string[]
  maxServiceDevices?: string[]
  serviceStations: string[]
  supportedActions: string[]
  ratedLoad: string
  connectedAt: string
  dispatchStatus?: 'enabled' | 'paused'
}

export interface MapResource {
  id: string
  type: 'machine' | 'buffer' | 'charge' | 'door' | 'recycle'
  label: string
  position: Point
  state?: 'normal' | 'fault'
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
  status: 'available' | 'occupied' | 'blocked'
  occupantId?: string
}

export interface TrafficSegment {
  id: string
  path: string
  status: 'clear' | 'occupied' | 'congested' | 'blocked'
  direction: 'one-way' | 'two-way'
  speedLimit: number
  occupantId?: string
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

export type MapEditorTool = 'select' | 'point' | 'route' | 'zone'
export type MapViewMode = 'scan' | 'logic' | 'overlay'
export type StationAssociationType = 'none' | 'dock' | 'charge' | 'parking'
export interface MapStation {
  id: string
  name: string
  alias: string
  description: string
  uid: string
  ownerGraphName: string
  x: number
  y: number
  yaw: number
  selectable: boolean
  relocatable: boolean
  disabled: boolean
  charged: boolean
  dockable: boolean
  parkable: boolean
  preMeshPoseName: string
  options: {
    narrow: { boolValue: boolean; kind: 'boolValue' }
    disjoint: { boolValue: boolean; kind: 'boolValue' }
    poseType: { stringValue: 'NORMAL' | 'DOCK'; kind: 'stringValue' }
    parkable: { boolValue: boolean; kind: 'boolValue' }
  }
  associationType: StationAssociationType
  deviceId: string
}
export type MapPoint = MapStation
export interface MapRoute {
  id: string
  name: string
  alias: string
  description: string
  ownerGraphName: string
  startId: string
  endId: string
  sourceName: string
  targetName: string
  type: 'STRAIGHT_LINE'
  positions: Array<{ x:number; y:number; yaw:number }>
  bidirectional: boolean
  backwards: boolean
  disabled: boolean
  maxLinearVel?: number
}
export interface MapPlacedResource { id: string; resourceType: 'CNC' | 'GATE' | 'BUF' | 'CHG'; pointId: string; x: number; y: number; approach: string }
export interface MapControlZone { id: string; x: number; y: number; width: number; height: number; type: string; speedLimit?: number }
export interface MapEditorDraft {
  mapId: string
  version: string
  resolution: string
  points: MapStation[]
  routes: MapRoute[]
  resources: MapPlacedResource[]
  zones: MapControlZone[]
  topologyPaths?: string[]
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
  strategy: '先进先出' | '最短距离' | '最短时间' | '提前叫料' | '负载均衡'
  apsEnabled: boolean
  updatedAt: string
}

export interface DispatchRule {
  id: string
  taskType: string
  strategy: DispatchSettings['strategy']
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
