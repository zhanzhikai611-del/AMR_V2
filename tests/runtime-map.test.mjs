import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('../', import.meta.url))
const result = await build({
  stdin: { contents: `export { withRuntimeMap, demoRoute } from './mock/data/runtime-map'; export { twinSnapshot } from './mock/data/operations'; export { mapEditorDrafts } from './mock/data/map-editor';`, resolveDir: root, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
})
const { withRuntimeMap, demoRoute, twinSnapshot, mapEditorDrafts } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)
const before = JSON.stringify(twinSnapshot)
const snapshot = withRuntimeMap(twinSnapshot)
const map = snapshot.runtimeMap
assert.equal(JSON.stringify(twinSnapshot), before, 'runtime adaptation must not mutate business data')
assert.equal(map.mapId, 'MAP-A-V18', 'only the current published map is used')
assert.equal(map.points.length, 378)
assert.equal(map.routes.length, 476)
assert.equal(map.points.filter(p => p.associationType === 'dock').length, 120)
const docks = map.points.filter(p => p.associationType === 'dock')
assert.equal(new Set(docks.map(p => p.deviceId)).size, 120, 'every station has a unique device')
assert.ok(docks.every(p => p.deviceId), 'no unlabeled dock stations')
assert.equal(snapshot.resources.filter(resource => resource.type === 'machine').length, 120)
for (const [device, count] of [['D04', 3], ['C04', 5], ['E04', 6]]) {
  assert.equal(snapshot.amrs.filter(amr => amr.serviceDevices.includes(device)).length, count)
}
for (const station of docks) {
  assert.equal(snapshot.resources.filter(resource => resource.id === station.deviceId && resource.boundPoint === station.id).length, 1)
}
for (const amr of snapshot.amrs) {
  assert.deepEqual(amr.serviceDevices, amr.serviceStations)
  assert.ok(amr.serviceDevices.every(id => snapshot.resources.some(resource => resource.id === id)))
  if (amr.maxServiceDevices) assert.ok(amr.serviceDevices.every(id => amr.maxServiceDevices.includes(id)))
}

const coord = p => `${p.x},${p.y}`
const byId = new Map(map.points.map(p => [p.id, p]))
const byDevice = new Map(map.points.filter(p => p.deviceId).map(p => [p.deviceId, p]))
const charger = byDevice.get('CHG-01')
const chargingAmr = snapshot.amrs.find(amr => amr.id === 'AMR-04')
assert.equal(charger.associationType, 'charge')
assert.equal(charger.charged, true)
assert.deepEqual(chargingAmr.position, { x: charger.x, y: charger.y }, 'charging vehicle stays at the mapped corner charger')
assert.equal(chargingAmr.status, '充电')
assert.equal(chargingAmr.speed, 0)
assert.equal(chargingAmr.taskId, null)
assert.ok(demoRoute(map, byDevice.get('C24').id, charger.id).length > 1, 'charger remains reachable on the existing map')
const disabledAmr = snapshot.amrs.find(amr => amr.id === 'AMR-06')
assert.equal(disabledAmr.status, '停用')
assert.equal(disabledAmr.runnable, false)
assert.equal(disabledAmr.dispatchStatus, 'paused')
assert.equal(disabledAmr.speed, 0)
assert.equal(disabledAmr.taskId, null)
assert.ok(snapshot.tasks.filter(task => task.amrId === disabledAmr.id).every(task => task.status === '待执行' && !task.plannedPath), 'disabled vehicle tasks wait without active routes')
const edges = new Set(map.routes.flatMap(route => {
  const start = coord(byId.get(route.startId)), end = coord(byId.get(route.endId))
  return route.disabled ? [] : [`${start}|${end}`, ...(route.bidirectional ? [`${end}|${start}`] : [])]
}))
const pathPoints = path => [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => ({ x: Number(m[1]), y: Number(m[2]) }))
for (const task of snapshot.tasks.filter(task => task.status !== '待执行')) {
  const points = pathPoints(task.plannedPath)
  assert.ok(points.length > 1, `${task.id} has a route`)
  assert.equal(coord(points.at(-1)), coord(byDevice.get(task.requestDeviceId)), 'route ends at the requested device station')
  points.slice(1).forEach((p, i) => assert.ok(edges.has(`${coord(points[i])}|${coord(p)}`), 'every segment follows an editor edge'))
  const amr = snapshot.amrs.find(amr => amr.taskId === task.id)
  if (task.status === '异常') assert.equal(coord(amr.position), coord(pathPoints(task.traveledPath).at(-1)), 'stopped vehicle matches its traveled path')
}
for (const resource of snapshot.resources.filter(r => r.type === 'machine')) {
  assert.equal(coord(resource.position), coord(byDevice.get(resource.id)))
  assert.equal(resource.boundPoint, byDevice.get(resource.id).id)
}
for (const amr of snapshot.amrs.filter(amr => ['AMR-05', 'AMR-06'].includes(amr.id))) {
  for (const manual of ['E08', 'E10']) {
    assert.ok(amr.maxServiceDevices.includes(manual))
    assert.ok(!amr.serviceDevices.includes(manual))
  }
}
const isolated = structuredClone(map)
const start = byDevice.get('D24').id, end = byDevice.get('D06').id
isolated.routes.forEach(route => { if (route.startId === start || route.endId === start) route.disabled = true })
assert.deepEqual(demoRoute(isolated, start, end), [], 'disabled connections must not be traversed')
const oneWay = { ...map, points: map.points.slice(0, 2), routes: [{ startId: map.points[0].id, endId: map.points[1].id, bidirectional: false, disabled: false }] }
assert.equal(demoRoute(oneWay, oneWay.points[0].id, oneWay.points[1].id).length, 2)
assert.deepEqual(demoRoute(oneWay, oneWay.points[1].id, oneWay.points[0].id), [], 'one-way edges cannot be reversed')
map.points[0].x = -999
assert.notEqual(mapEditorDrafts[map.mapId].points[0].x, -999, 'runtime snapshot must be isolated from editor drafts')
assert.notEqual(withRuntimeMap(twinSnapshot).runtimeMap.points[0].x, -999)
console.log('PASS: map/version isolation, device bindings, route connectivity, disabled/one-way edges, vehicle position and manual-loading exclusions')
