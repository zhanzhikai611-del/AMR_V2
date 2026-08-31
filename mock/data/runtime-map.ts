import type { MapEditorDraft, MapStation, Point, TwinSnapshot } from '../../src/types/domain'
import { mapEditorDrafts } from './map-editor'
import { mapDefinitions } from './resource-management'

function pathData(points: Point[]) {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join('')
}

// Demo-only route generation, over the editor's actual edges. Production paths
// must come from the dispatcher; the monitoring component never plans a route.
export function demoRoute(map: MapEditorDraft, startId: string, endId: string): MapStation[] {
  const points = new Map(map.points.map(point => [point.id, point]))
  const neighbors = new Map<string, string[]>()
  for (const route of map.routes) {
    if (route.disabled || points.get(route.startId)?.disabled || points.get(route.endId)?.disabled) continue
    neighbors.set(route.startId, [...(neighbors.get(route.startId) ?? []), route.endId])
    if (route.bidirectional) neighbors.set(route.endId, [...(neighbors.get(route.endId) ?? []), route.startId])
  }
  if (!points.has(startId) || !points.has(endId)) return []
  const distances = new Map<string, number>([[startId, 0]])
  const previous = new Map<string, string>()
  const pending = new Set([startId])
  const visited = new Set<string>()
  while (pending.size) {
    const current = [...pending].sort((a, b) => distances.get(a)! - distances.get(b)!)[0]!
    pending.delete(current)
    if (current === endId) break
    visited.add(current)
    for (const id of neighbors.get(current) ?? []) {
      if (visited.has(id) || !points.has(id)) continue
      const a = points.get(current)!, b = points.get(id)!
      const distance = distances.get(current)! + Math.hypot(a.x - b.x, a.y - b.y)
      if (distance >= (distances.get(id) ?? Infinity)) continue
      distances.set(id, distance)
      previous.set(id, current)
      pending.add(id)
    }
  }
  if (!distances.has(endId)) return []
  const ids = [endId]
  while (ids[0] !== startId) ids.unshift(previous.get(ids[0]!)!)
  return ids.map(id => points.get(id)!)
}

function samplePath(points: Point[], progress: number) {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index]!.x, point.y - points[index]!.y))
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * progress
  const traveled: Point[] = [points[0]!]
  for (let index = 0; index < lengths.length; index++) {
    const start = points[index]!, end = points[index + 1]!, length = lengths[index]!
    if (remaining > length || length === 0) {
      traveled.push(end)
      remaining -= length
      continue
    }
    const ratio = remaining / length
    const position = { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio }
    traveled.push(position)
    return { position, heading: Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI + 90, traveledPath: pathData(traveled) }
  }
  return { position: points.at(-1)!, heading: 0, traveledPath: pathData(traveled) }
}

export function withRuntimeMap(source: TwinSnapshot): TwinSnapshot {
  const snapshot = structuredClone(source)
  const definition = mapDefinitions.find(map => map.current && map.status === '已发布')
  if (!definition || !mapEditorDrafts[definition.id]) throw new Error('没有可用的已发布运行地图')
  const map = structuredClone(mapEditorDrafts[definition.id]!)
  snapshot.runtimeMap = { ...map, version: definition.mapVersion ?? map.version, name: definition.name, demo: true }
  snapshot.simulation = true
  const devicePoints = new Map(map.points.filter(point => point.deviceId).map(point => [point.deviceId, point]))
  for (const resource of snapshot.resources) {
    const point = devicePoints.get(resource.id)
    if (point) { resource.position = { x: point.x, y: point.y }; resource.boundPoint = point.id }
  }
  for (const amr of snapshot.amrs) {
    const start = devicePoints.get(amr.initialPoint)
    if (start) { amr.position = { x: start.x, y: start.y }; amr.heading = start.yaw * 180 / Math.PI }
  }
  for (const task of snapshot.tasks) {
    task.plannedPath = ''
    task.traveledPath = ''
    if (task.status === '待执行') continue
    const amr = snapshot.amrs.find(amr => amr.id === task.amrId)
    const start = devicePoints.get(amr?.initialPoint ?? '')
    const end = devicePoints.get(task.requestDeviceId)
    if (!amr || !start || !end) continue
    const points = demoRoute(map, start.id, end.id)
    if (points.length < 2) continue
    task.plannedPath = pathData(points)
    const sample = samplePath(points, task.status === '异常' ? task.progress / 100 : 0)
    task.traveledPath = sample.traveledPath
    if (amr.taskId === task.id) {
      amr.position = sample.position
      amr.heading = sample.heading
    }
  }
  const points = new Map(map.points.map(point => [point.id, point]))
  snapshot.topology = { columns: [], rows: [], paths: map.routes.flatMap(route => {
    const start = points.get(route.startId), end = points.get(route.endId)
    return start && end ? [pathData([start, end])] : []
  }) }
  // The old mock traffic overlays belong to the retired schematic coordinate frame.
  snapshot.trafficZones = []
  snapshot.trafficSegments = []
  return snapshot
}
