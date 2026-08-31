import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('../', import.meta.url))
const { outputFiles } = await build({
  stdin: { contents: `export { layoutStationLabels } from './src/features/digital-twin/station-label-layout'; export { twinSnapshot } from './mock/data/operations'; export { mapEditorDrafts } from './mock/data/map-editor';`, resolveDir: root, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
})
const { layoutStationLabels, twinSnapshot, mapEditorDrafts } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const stations = mapEditorDrafts['MAP-A'].points.filter(p => p.associationType === 'dock').map(p => ({
  id: p.id, x: p.x, y: p.y, title: p.deviceId,
  serviceIds: twinSnapshot.amrs.filter(amr => amr.serviceDevices.includes(p.deviceId)).map(amr => amr.id),
}))
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
function validate(input) {
  const untouched = JSON.stringify(input)
  const labels = layoutStationLabels(input)
  assert.equal(JSON.stringify(input), untouched)
  assert.equal(labels.length, input.length, 'never drop device labels')
  assert.equal(new Set(labels.map(label => label.id)).size, input.length)
  for (const [index, label] of labels.entries()) {
    const station = input.find(p => p.id === label.id)
    assert.equal(label.anchorX, station.x)
    assert.equal(label.anchorY, station.y)
    assert.ok(label.edgeX === label.x || label.edgeX === label.x + label.width)
    assert.ok(label.edgeY >= label.y && label.edgeY <= label.y + label.height)
    for (const other of labels.slice(index + 1)) assert.ok(!overlaps(label, other), `${label.id} overlaps ${other.id}`)
    for (const anchor of input) assert.ok(!overlaps(label, { x: anchor.x - 3.5, y: anchor.y - 3.5, width: 7, height: 7 }), 'do not cover station markers')
  }
  return labels
}
assert.equal(stations.length, 120)
const current = validate(stations)
assert.deepEqual(current, layoutStationLabels([...stations].reverse()), 'layout does not depend on source array order')
for (const count of [2, 3, 5, 8, 12]) {
  const variant = structuredClone(stations)
  variant[0].serviceIds = Array.from({ length: count }, (_, i) => `AMR-${String(i + 1).padStart(2, '0')}`)
  const labels = validate(variant)
  assert.deepEqual(labels, current, 'service vehicle count does not change equipment name layout')
}
validate(stations.map(station => ({ ...station, serviceIds: Array.from({ length: 8 }, (_, i) => `AMR-${i + 1}`) })))
assert.deepEqual(layoutStationLabels([]), [])
console.log('PASS: 120 equipment labels, no card/marker overlap, stable order, connected anchors, layout independent of service vehicle count')
