export interface LabelStation { id: string; x: number; y: number; title: string }
export interface StationLabelLayout {
  id: string; x: number; y: number; width: number; height: number
  anchorX: number; anchorY: number; leader: string; edgeX: number; edgeY: number
}
const LABEL_WIDTH = 8
const LABEL_HEIGHT = 13
const GAP = 2
interface Box { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

// Compact vertical nameplates stay centered on their stations. Their narrow
// footprint suits dense paired aisles; collisions move upward without changing
// the station-to-label relationship.
export function layoutStationLabels(stations: LabelStation[]): StationLabelLayout[] {
  const result: StationLabelLayout[] = []
  const markers = stations.map(point => ({ x: point.x - 2.5, y: point.y - 2.5, width: 5, height: 5 }))
  const ordered = [...stations].sort((a, b) => b.y - a.y || a.x - b.x || a.id.localeCompare(b.id))
  for (const point of ordered) {
    const boxes = [{ point, x: point.x - LABEL_WIDTH / 2,
      y: point.y - 5 - LABEL_HEIGHT, width: LABEL_WIDTH, height: LABEL_HEIGHT }]
    const obstacles: Box[] = [...markers, ...result]
    let collision = boxes.flatMap(box => obstacles.filter(other => overlaps(box, other)).map(other => ({ box, other })))[0]
    while (collision) {
      const nextY = collision.other.y - LABEL_HEIGHT - GAP
      boxes.forEach(box => { box.y = Math.min(box.y, nextY) })
      collision = boxes.flatMap(box => obstacles.filter(other => overlaps(box, other)).map(other => ({ box, other })))[0]
    }
    boxes.forEach(({ point, ...box }) => {
      const edgeX = point.x, edgeY = box.y + box.height
      result.push({ id: point.id, ...box, anchorX: point.x, anchorY: point.y,
        edgeX, edgeY, leader: `M${point.x} ${point.y - 2.5}L${edgeX} ${edgeY}` })
    })
  }
  return result
}
