import type { MapEditorDraft, MapRoute, MapStation } from '../../src/types/domain'
import { demoDeviceBindings } from './map-device-bindings'

const points: MapStation[] = []
const routes: MapRoute[] = []
let routeIndex = 1

function addPoint(id: string, x: number, y: number, service = false, yaw = 0, associationType: string = 'none'): string {
  points.push({
    id,
    name: id,
    alias: id,
    description: service ? '机台侧 AMR 停靠点' : '路网连接点',
    uid: `mock-${id}`,
    ownerGraphName: 'MAP-A',
    x,
    y,
    yaw,
    selectable: true,
    relocatable: true,
    disabled: false,
    charged: associationType === 'charge',
    dockable: associationType === 'dock',
    parkable: associationType === 'parking',
    preMeshPoseName: '',
    options: {
      narrow: { boolValue: false, kind: 'boolValue' },
      disjoint: { boolValue: false, kind: 'boolValue' },
      poseType: { stringValue: associationType === 'dock' ? 'DOCK' : 'NORMAL', kind: 'stringValue' },
      parkable: { boolValue: associationType === 'parking', kind: 'boolValue' },
    },
    associationType: associationType as any,
    deviceId: '',
  })
  return id
}

function connect(startId: string, endId: string, speed = 1.2) {
  const id = `R-${String(routeIndex++).padStart(3, '0')}`
  routes.push({
    id,
    name: id,
    alias: id,
    description: '',
    ownerGraphName: 'MAP-A',
    startId,
    endId,
    sourceName: startId,
    targetName: endId,
    type: 'STRAIGHT_LINE',
    positions: [],
    bidirectional: true,
    backwards: false,
    disabled: false,
    maxLinearVel: speed,
  })
}

function addPolyline(prefix: string, coordinates: Array<[number, number]>, speed = 1.2) {
  const ids = coordinates.map(([x, y], index) => addPoint(`${prefix}-${index + 1}`, x, y))
  ids.slice(1).forEach((id, index) => connect(ids[index], id, speed))
  return ids
}

// 中间 CNC 区：每条巷道是两条平行路线，停靠三角形直接落在路线上。
// 点云轮廓的通行带整体略偏右，统一平移可保持双线间距及换道关系不变。
const aisleCenters = [176, 233, 293, 359, 416, 475, 535, 589]
const laneOffset = 4
const verticalRows = [80, 96, 125, 145, 171, 193, 215, 226, 254, 270, 274, 278, 314, 319, 358, 360, 396, 400, 425, 431, 435, 439]
const serviceRows = new Set([96, 145, 193, 226, 319, 360, 400, 425])
const aisleLaneIds: string[][][] = []

aisleCenters.forEach((centerX, aisleIndex) => {
  const lanes: string[][] = []
  // 靠右侧墙体的最后一排设备只有一个服务面，只生成靠墙侧的一条路线。
  const laneOffsets = aisleIndex === aisleCenters.length - 1 ? [laneOffset] : [-laneOffset, laneOffset]
  laneOffsets.forEach((offset, laneIndex) => {
    const ids = verticalRows.map((y) => {
      const service = serviceRows.has(y)
      return addPoint(
        `A${aisleIndex + 1}-${offset < 0 ? 'L' : 'R'}-${y}`,
        centerX + offset,
        y,
        service,
        0,
        service ? 'dock' : 'none',
      )
    })
    ids.slice(1).forEach((id, index) => connect(ids[index], id))
    lanes.push(ids)
  })
  aisleLaneIds.push(lanes)

  // X 形路线由左右两侧相邻站点交叉相连，每个端点都是可导航站点。
  if (lanes.length === 2) {
    ;[[96, 145], [145, 193], [193, 226], [319, 360], [360, 400], [400, 425]].forEach(([fromY, toY]) => {
      const fromIndex = verticalRows.indexOf(fromY)
      const toIndex = verticalRows.indexOf(toY)
      connect(lanes[0][fromIndex], lanes[1][toIndex], 0.8)
      connect(lanes[1][fromIndex], lanes[0][toIndex], 0.8)
    })
  }
})

function addHorizontalLine(prefix: string, y: number, xs: number[], showArrows = true, parkingIndices: number[] = []) {
  const ids = xs.map((x, index) => addPoint(`${prefix}-${index + 1}`, x, y, showArrows && index > 0 && index < xs.length - 1, 90 * Math.PI / 180, parkingIndices.includes(index) ? 'parking' : 'none'))
  ids.slice(1).forEach((id, index) => connect(ids[index], id))
  return ids
}

// 没有成排设备停靠点的横向通道保持单线，并在交汇处保留方向箭头。
const horizontalXs = [140, ...aisleCenters.flatMap((x) => [x - laneOffset, x + laneOffset])]
const centerLine = addHorizontalLine('H-C', 274, horizontalXs, true, [3, 7, 11, 15])
const bottomLine = addHorizontalLine('H-B', 435, [140, ...aisleCenters.flatMap((x) => [x - laneOffset, x + laneOffset])])

aisleLaneIds.forEach((lanes, aisleIndex) => {
  const leftXIndex = 1 + aisleIndex * 2
  const rightXIndex = leftXIndex + 1
  if (lanes.length === 1) {
    connect(lanes[0][verticalRows.indexOf(274)], centerLine[rightXIndex])
    connect(lanes[0][verticalRows.indexOf(435)], bottomLine[rightXIndex])
  } else {
    connect(lanes[0][verticalRows.indexOf(274)], centerLine[leftXIndex])
    connect(lanes[1][verticalRows.indexOf(274)], centerLine[rightXIndex])
    connect(lanes[0][verticalRows.indexOf(435)], bottomLine[leftXIndex])
    connect(lanes[1][verticalRows.indexOf(435)], bottomLine[rightXIndex])
  }
})

// 左侧是贴近机台区边界的直线接入，不再使用穿过房间的斜线。
const leftOuter = addPolyline('SIDE-L', [[140, 274], [140, 435]])
connect(centerLine[0], leftOuter[0])
connect(leftOuter[1], bottomLine[0])

// 最右侧只有一排设备，所以只保留一条服务路线和一排向上停靠箭头。
// 主横线先沿墙边下折，经门洞穿过墙体，再分向右侧上下两段。
const rightGap = addPolyline('SIDE-R-GAP', [[605, 274], [605, 322], [635, 322], [660, 314], [690, 310]])
connect(centerLine[centerLine.length - 1], rightGap[0])

const rightUpperRows = [92, 108, 157, 205, 238, 286, 310]
const rightUpper = rightUpperRows.map((y, index) => addPoint(`SIDE-RU-${y}`, 690, y, index > 0 && index < rightUpperRows.length - 1, 0))
// 演示充电位设在右上角靠墙通道末端，复用既有站点与路线。
const cornerCharger = points.find(point => point.id === rightUpper[0])!
cornerCharger.associationType = 'charge'
cornerCharger.charged = true
cornerCharger.deviceId = 'CHG-01'
cornerCharger.description = '右上角充电位'
rightUpper.slice(1).forEach((id, index) => connect(rightUpper[index], id))
connect(rightUpper[rightUpper.length - 1], rightGap[rightGap.length - 1])

// 右下区域目前不建立路线，待现场通行范围确认后再补。

for (const binding of demoDeviceBindings) {
  const point = points.find(point => point.id === binding.stationId)
  if (point) point.deviceId = binding.deviceId
}

const baseDraft: MapEditorDraft = {
  mapId: 'MAP-A',
  version: 'V19.06',
  resolution: '0.05 m/px',
  points,
  routes,
  resources: [],
  zones: [],
  topologyPaths: [],
}

export const mapEditorDrafts: Record<string, MapEditorDraft> = {
  'MAP-A': baseDraft,
  'MAP-A-V18': { ...baseDraft, mapId: 'MAP-A-V18', version: 'V18' },
  'MAP-A-V19-03': { ...baseDraft, mapId: 'MAP-A-V19-03', version: 'V19.03' },
  'MAP-A-V19-06': { ...baseDraft, mapId: 'MAP-A-V19-06', version: 'V19.06' },
}
