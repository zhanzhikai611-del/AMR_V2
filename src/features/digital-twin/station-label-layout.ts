export interface LabelStation { id: string; x: number; y: number; title: string }
export interface StationLabelLayout {
  id: string; x: number; y: number; width: number; height: number
  anchorX: number; anchorY: number; leader: string; edgeX: number; edgeY: number
}
const GAP = 2
const LABEL_HEIGHT = 14

// Project desired label positions onto ordered, non-overlapping slots. Unlike
// pushing everything down, isotonic regression distributes displacement both ways.
function packColumn(items: Array<{ desired: number; height: number }>, top: number, bottom: number) {
  const offsets: number[] = []
  let total = 0
  const blocks: Array<{ start: number; end: number; sum: number; count: number }> = []
  items.forEach((item, index) => {
    offsets.push(total)
    total += item.height + GAP
    blocks.push({ start: index, end: index, sum: item.desired - offsets[index]!, count: 1 })
    while (blocks.length > 1) {
      const right = blocks.at(-1)!, left = blocks.at(-2)!
      if (left.sum / left.count <= right.sum / right.count) break
      blocks.splice(-2, 2, { start: left.start, end: right.end, sum: left.sum + right.sum, count: left.count + right.count })
    }
  })
  total -= GAP
  // Extend a dense column into surrounding space rather than overlap labels.
  const overflow = Math.max(0, total - (bottom - top))
  const min = top - overflow / 2, max = bottom + overflow / 2 - total
  const positions: number[] = []
  for (const block of blocks) {
    const value = Math.max(min, Math.min(max, block.sum / block.count))
    for (let i = block.start; i <= block.end; i++) positions[i] = value + offsets[i]!
  }
  return positions
}

export function layoutStationLabels(stations: LabelStation[]): StationLabelLayout[] {
  if (!stations.length) return []
  const xs = [...new Set(stations.map(point => point.x))].sort((a, b) => a - b)
  const columns = new Map<number, Array<LabelStation & { side: number; width: number; height: number }>>()
  for (const point of stations) {
    const next = xs.find(x => x > point.x)
    const side = next !== undefined && next - point.x <= 10 ? -1 : 1
    const neighbor = side < 0 ? xs.filter(x => x < point.x - 10).at(-1) : xs.find(x => x > point.x + 10)
    const column = neighbor === undefined ? point.x + side * 32 : (point.x + neighbor) / 2
    const width = Math.max(28, point.title.length * 5 + 8)
    columns.set(column, [...(columns.get(column) ?? []), { ...point, side, width, height: LABEL_HEIGHT }])
  }
  const result: StationLabelLayout[] = []
  let previousRight = -Infinity
  for (const [column, points] of [...columns].sort(([a], [b]) => a - b)) {
    const width = Math.max(...points.map(point => point.width))
    const x = Math.max(column - width / 2, previousRight + 10)
    previousRight = x + width
    points.sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))
    const positions = packColumn(points.map(point => ({ desired: point.y - point.height / 2 - point.side * (point.height + GAP) / 2, height: point.height })), 45, 483)
    points.forEach((point, index) => {
      const y = positions[index]!, edgeX = point.side > 0 ? x : x + width, edgeY = y + point.height / 2
      result.push({ id: point.id, x, y, width, height: point.height, anchorX: point.x, anchorY: point.y,
        edgeX, edgeY, leader: `M${point.x} ${point.y}L${edgeX} ${edgeY}`,
      })
    })
  }
  return result
}
