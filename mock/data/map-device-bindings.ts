// Prototype bindings only. Replace with surveyed mappings before connecting a fleet.
// Keep existing device identities used by tasks; fill every remaining dock station.
const demoColumns = [
  { aisle: 'A1-R', devices: ['D02', 'D04', 'D06', 'D08', 'D10', 'D12'] },
  { aisle: 'A2-R', devices: ['D14', 'D16', 'D18', 'D20', 'D22', 'D24'] },
  { aisle: 'A3-R', devices: ['C02', 'C04', 'C06', 'C08', 'C10', 'C12'] },
  { aisle: 'A5-R', devices: ['C14', 'C16', 'C18', 'C20', 'C22', 'C24'] },
  { aisle: 'A6-R', devices: ['E02', 'E04', 'E06', 'E08', 'E10', 'E12'] },
  { aisle: 'A7-R', devices: ['E14', 'E16', 'E18', 'E20', 'E22', 'E24'] },
]
const demoRows = [96, 145, 193, 319, 360, 400]

const existingBindings = demoColumns.flatMap(column =>
  column.devices.map((deviceId, index) => ({ deviceId, stationId: `${column.aisle}-${demoRows[index]}` })),
)

export const demoServiceGroups = [
  { prefix: 'D', lanes: ['A1-L', 'A1-R', 'A2-L', 'A2-R', 'A3-L'], amrs: ['AMR-01', 'AMR-02'] },
  { prefix: 'C', lanes: ['A3-R', 'A4-L', 'A4-R', 'A5-L', 'A5-R'], amrs: ['AMR-03', 'AMR-04'] },
  { prefix: 'E', lanes: ['A6-L', 'A6-R', 'A7-L', 'A7-R', 'A8-R'], amrs: ['AMR-05', 'AMR-06'] },
] as const
const serviceRows = [96, 145, 193, 226, 319, 360, 400, 425]
const existingByStation = new Map(existingBindings.map(binding => [binding.stationId, binding.deviceId]))
export const manualLoadingDevices = new Set(['E08', 'E10'])
// A few shared devices exercise 3/5/6-AMR cards with the existing six-vehicle
// demo fleet. These are UI sample relationships, not dispatch assignments.
const sharedDeviceAmrs: Record<string, string[]> = {
  D04: ['AMR-01', 'AMR-02', 'AMR-03'],
  C04: ['AMR-01', 'AMR-02', 'AMR-03', 'AMR-04', 'AMR-05'],
  E04: ['AMR-01', 'AMR-02', 'AMR-03', 'AMR-04', 'AMR-05', 'AMR-06'],
}
export const demoDeviceBindings = demoServiceGroups.flatMap(group => {
  let nextNumber = 26
  return group.lanes.flatMap(lane => serviceRows.map(row => {
    const stationId = `${lane}-${row}`
    const deviceId = existingByStation.get(stationId) ?? `${group.prefix}${String(nextNumber).padStart(2, '0')}`
    if (!existingByStation.has(stationId)) nextNumber += 2
    return { deviceId, stationId, group: group.prefix, amrIds: sharedDeviceAmrs[deviceId] ?? [...group.amrs] }
  }))
})

export function serviceDevicesForAmr(amrId: string, includeManual = false): string[] {
  return demoDeviceBindings.filter(binding => binding.amrIds.some(id => id === amrId)
    && (includeManual || !manualLoadingDevices.has(binding.deviceId)))
    .map(binding => binding.deviceId).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}
