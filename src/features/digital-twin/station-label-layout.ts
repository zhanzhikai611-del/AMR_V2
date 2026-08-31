export interface LabelStation { id: string; x: number; y: number; title: string }
export interface StationLabelLayout {
  id: string; x: number; y: number; width: number; height: number
  anchorX: number; anchorY: number; leader: string; edgeX: number; edgeY: number
}
const LABEL_HEIGHT = 10
const GAP = 2
interface Box { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

// Pair only adjacent stations on the same row. Their names open outward at one
// shared height; isolated names stay centered. Vehicle state never affects layout.
export function layoutStationLabels(stations: LabelStation[]): StationLabelLayout[] {
  const result: StationLabelLayout[] = []
  const markers = stations.map(point => ({ x: point.x - 3.5, y: point.y - 3.5, width: 7, height: 7 }))
  const ordered = [...stations].sort((a, b) => b.y - a.y || a.x - b.x || a.id.localeCompare(b.id))
  for (let index = 0; index < ordered.length; index++) {
    const first = ordered[index]!, next = ordered[index + 1]
    const paired = next && next.y === first.y && next.x > first.x && next.x - first.x <= 10
    const group = paired ? [first, ordered[++index]!] : [first]
    const boxes = group.map((point, side) => {
      const width = Math.max(21, point.title.length * 4 + 8)
      return { point, x: paired ? (side === 0 ? point.x - width - 1 : point.x + 1) : point.x - width / 2,
        y: point.y - 7 - LABEL_HEIGHT, width, height: LABEL_HEIGHT }
    })
    const obstacles: Box[] = [...markers, ...result]
    // If an imported map is denser, move the whole pair together, preserving
    // left/right identity and equal heights instead of rearranging individual names.
    let collision = boxes.flatMap(box => obstacles.filter(other => overlaps(box, other)).map(other => ({ box, other })))[0]
    while (collision) {
      const shift = collision.box.y + LABEL_HEIGHT + GAP - collision.other.y
      boxes.forEach(box => { box.y -= shift })
      collision = boxes.flatMap(box => obstacles.filter(other => overlaps(box, other)).map(other => ({ box, other })))[0]
    }
    boxes.forEach(({ point, ...box }, side) => {
      const edgeX = paired ? (side === 0 ? box.x + box.width : box.x) : point.x
      const edgeY = box.y + box.height
      result.push({ id: point.id, ...box, anchorX: point.x, anchorY: point.y,
        edgeX, edgeY, leader: `M${point.x} ${point.y - 3.5}L${edgeX} ${edgeY}` })
    })
  }
  return result
}
