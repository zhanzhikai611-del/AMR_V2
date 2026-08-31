export interface LabelStation { id: string; x: number; y: number; title: string }
export interface StationLabelLayout {
  id: string; x: number; y: number; width: number; height: number
  anchorX: number; anchorY: number; leader: string; edgeX: number; edgeY: number
}
const LABEL_HEIGHT = 8
const GAP = 1
interface Box { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

// Keep each name centered over its actual station. Nearby names only move up,
// never sideways into another aisle; fixed geometry keeps the layout stable.
export function layoutStationLabels(stations: LabelStation[]): StationLabelLayout[] {
  const result: StationLabelLayout[] = []
  const markers = stations.map(point => ({ x: point.x - 3.5, y: point.y - 3.5, width: 7, height: 7 }))
  const ordered = [...stations].sort((a, b) => b.y - a.y || a.x - b.x || a.id.localeCompare(b.id))
  for (const point of ordered) {
    const width = Math.max(18, point.title.length * 3.5 + 6)
    const box = { x: point.x - width / 2, y: point.y - 5 - LABEL_HEIGHT, width, height: LABEL_HEIGHT }
    const obstacles: Box[] = [...markers, ...result]
    let blocker = obstacles.find(other => overlaps(box, other))
    while (blocker) {
      box.y = blocker.y - LABEL_HEIGHT - GAP
      blocker = obstacles.find(other => overlaps(box, other))
    }
    const edgeX = point.x, edgeY = box.y + box.height
    result.push({ id: point.id, ...box, anchorX: point.x, anchorY: point.y,
      edgeX, edgeY, leader: `M${point.x} ${point.y - 3.5}V${edgeY}` })
  }
  return result
}
