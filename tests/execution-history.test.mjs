import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
const { outputFiles } = await build({
  stdin: { contents: `export * from './src/features/tasks/execution-history'; export { taskRecords } from './mock/data/task-records';`, resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
})
const { advanceSimulatedSteps, snapshotExecution, taskRecords } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const steps = Array.from({ length: 7 }, (_, index) => ({ id: String(index), name: `节点 ${index}`, status: index === 0 ? 'running' : 'pending', duration: '—' }))
const advanced = advanceSimulatedSteps(steps, 50, 10)
assert.deepEqual(advanced.map(s => s.status), ['success', 'success', 'success', 'running', 'pending', 'pending', 'pending'])
assert.ok(advanceSimulatedSteps(advanced, 100, 10).every(s => s.status === 'success'))
advanced[3].status = 'failure'
advanced[3].detail = '交通申请超时'
const snapshot = snapshotExecution(advanced, '已取消')
assert.equal(snapshot.canceledStepId, '3')
assert.equal(snapshot.cancelReason, '交通申请超时')
advanced[3].detail = '修改实时数据'
assert.equal(snapshot.behaviorSteps[3].detail, '交通申请超时')
assert.equal(snapshot.behaviorSteps[4].status, 'pending')
assert.equal(snapshotExecution([], '已取消').canceledStepId, undefined)
assert.equal(snapshotExecution(steps.map(s => ({ ...s, status: 'pending' })), '已取消').canceledStepId, undefined)
for (const record of taskRecords) {
  assert.equal(record.behaviorSteps.length, 4)
  if (record.result === '已完成') assert.ok(record.behaviorSteps.every(s => s.status === 'success'))
  else assert.ok(record.behaviorSteps.some(s => s.id === record.canceledStepId && s.status === 'failure'))
}
console.log('Execution history tests passed (snapshots, cancellation, arbitrary nodes, Mock records).')
