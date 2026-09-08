// Prototype bindings only. Physical aisles are named from right to left A-H.
// Line A is the single, wall-side lane; B-H each have a left and right lane.
const serviceRows = [96, 145, 193, 226, 309, 350, 390, 417]
const lineByAisle = ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'] as const

const serviceAmrsByLine: Record<string, string[]> = {
  H: ['AMR-01'],
  G: ['AMR-01', 'AMR-02'],
  F: ['AMR-02', 'AMR-03'],
  E: ['AMR-03', 'AMR-04'],
  D: ['AMR-04'],
  C: ['AMR-05'],
  B: ['AMR-05', 'AMR-06'],
  A: ['AMR-06'],
}

export const demoDeviceBindings = lineByAisle.flatMap((line, aisleIndex) => {
  const aisle = `A${aisleIndex + 1}`
  const lanes = line === 'A' ? ['R'] as const : ['L', 'R'] as const
  return lanes.flatMap(side => serviceRows.map((row, index) => {
    const number = side === 'R' ? 2 + index * 2 : 18 + index * 2
    const deviceId = `${line}${String(number).padStart(2, '0')}`
    return {
      deviceId,
      stationId: `${aisle}-${side}-${row}`,
      group: line,
      direction: line === 'A' || side === 'L' ? 'left' as const : 'right' as const,
      amrIds: serviceAmrsByLine[line]!,
    }
  }))
})

export const demoServiceGroups = Object.entries(serviceAmrsByLine).map(([prefix, amrs]) => ({ prefix, amrs }))
export const manualLoadingDevices = new Set(['C08', 'C10'])

export function serviceDevicesForAmr(amrId: string, includeManual = false): string[] {
  return demoDeviceBindings.filter(binding => binding.amrIds.some(id => id === amrId)
    && (includeManual || !manualLoadingDevices.has(binding.deviceId)))
    .map(binding => binding.deviceId).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}
