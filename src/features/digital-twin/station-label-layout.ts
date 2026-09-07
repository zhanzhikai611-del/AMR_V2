export interface LabelStation {
  id: string; x: number; y: number; title: string
  yaw?: number; direction?: 'left' | 'right'
}
export interface StationLabelLayout {
  id: string; x: number; y: number; width: number; height: number
  anchorX: number; anchorY: number; leader: string; edgeX: number; edgeY: number
}
const LABEL_HEIGHT = 8
const GAP = .8
const MARKER_CLEARANCE = 3.5
interface Box { x: number; y: number; width: number; height: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

// Horizontal nameplates sit directly on the arrow-relative side supplied by
// the equipment table. A very short connector preserves station ownership.
export function layoutStationLabels(stations: LabelStation[]): StationLabelLayout[] {
  const markers = stations.map(point => ({ x: point.x - MARKER_CLEARANCE, y: point.y - MARKER_CLEARANCE,
    width: MARKER_CLEARANCE * 2, height: MARKER_CLEARANCE * 2 }))
  const ordered = [...stations].sort((a, b) => b.y - a.y || a.x - b.x || a.id.localeCompare(b.id))
  const entries = ordered.map(point => {
    const width = Math.max(12, point.title.length * 3.2 + 4)
    return { point, box: { x: point.x - width / 2, y: point.y - 5 - LABEL_HEIGHT, width, height: LABEL_HEIGHT }, distance: 0 }
  })

  function moveToDirectedSide(entry: typeof entries[number], distance?: number) {
    const { point, box } = entry
    const yaw = point.yaw ?? 0
    const side = point.direction === 'left' ? -1 : 1
    const sideX = Math.cos(yaw) * side, sideY = Math.sin(yaw) * side
    const halfExtent = (Math.abs(sideX) * box.width + Math.abs(sideY) * box.height) / 2
    entry.distance = distance ?? MARKER_CLEARANCE + GAP + halfExtent
    box.x = point.x + sideX * entry.distance - box.width / 2
    box.y = point.y + sideY * entry.distance - box.height / 2
  }
  entries.forEach(entry => moveToDirectedSide(entry))

  // If a dense group still touches after the first balanced move, push every
  // participant in that collision outward by the same small increment.
  for (let attempt = 0; attempt < 20; attempt++) {
    const touching = new Set<string>()
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]!
      if (markers.some(marker => overlaps(entry.box, marker))) touching.add(entry.point.id)
      for (let other = index + 1; other < entries.length; other++) {
        if (overlaps(entry.box, entries[other]!.box)) {
          touching.add(entry.point.id)
          touching.add(entries[other]!.point.id)
        }
      }
    }
    if (!touching.size) break
    for (const entry of entries.filter(item => touching.has(item.point.id))) {
      moveToDirectedSide(entry, entry.distance ? entry.distance + 3 : undefined)
    }
  }

  return entries.map(({ point, box }) => {
    const edgeX = clamp(point.x, box.x, box.x + box.width)
    const edgeY = clamp(point.y, box.y, box.y + box.height)
    const dx = edgeX - point.x, dy = edgeY - point.y, length = Math.hypot(dx, dy) || 1
    const startX = point.x + dx / length * 2.5, startY = point.y + dy / length * 2.5
    return { id: point.id, ...box, anchorX: point.x, anchorY: point.y,
      edgeX, edgeY, leader: `M${startX} ${startY}L${edgeX} ${edgeY}` }
  })
}
