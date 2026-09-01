// Shared drawing frame for the current imported prototype map.
export const MAP_FRAME = { width: 760, height: 520 }
export const POINTCLOUD_FRAME = { x: 20, y: 52, width: 720, height: 405 }

export const DEFAULT_MAP_METERS_PER_UNIT = 0.05

export function mapMetersPerUnit(resolution?: string) {
  const value = Number.parseFloat(resolution ?? '')
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAP_METERS_PER_UNIT
}

export function getMapScaleBar(pixelsPerUnit: number, metersPerUnit = DEFAULT_MAP_METERS_PER_UNIT, targetPixels = 92) {
  const rawMeters = targetPixels / Math.max(pixelsPerUnit, 0.001) * metersPerUnit
  const exponent = 10 ** Math.floor(Math.log10(rawMeters))
  const normalized = rawMeters / exponent
  const step = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1
  const meters = step * exponent
  return { meters, pixels: meters / metersPerUnit * pixelsPerUnit }
}
