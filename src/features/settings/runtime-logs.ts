import type { SystemLog } from '../../types/settings'

export function createDemoLogSource(seed: SystemLog[]) {
  const templates = [...seed].sort((a,b) => a.time.localeCompare(b.time)).slice(-15)
  let sequence = 0
  const session = Date.now().toString(36)
  return () => {
    const template = templates[sequence % templates.length]
    if (!template) return []
    const cycle = Math.floor(sequence / templates.length)
    const date = new Date()
    const time = `${date.toLocaleDateString('sv-SE')} ${date.toTimeString().slice(0,8)}.${String(date.getMilliseconds()).padStart(3,'0')}`
    const row: SystemLog = { ...template, id:`live-${session}-${sequence++}`, time,
      traceId:`trc_${session}_${cycle}_${template.amr === 'AMR-03' ? 'task' : template.amr}`,
      task:template.task === '—' ? '—' : `TSK-${session}-${String(cycle+1).padStart(3,'0')}`,
    }
    return [row]
  }
}

export const logIdentity = (row: SystemLog) => row.id || `${row.time}|${row.service}|${row.event}|${row.traceId}|${row.summary}`
export const formatLogLine = (row: SystemLog) => `${row.time} ${row.level.padEnd(5)} [${row.service}] ${row.summary}  ${[row.amr !== '—' ? `amr=${row.amr}` : '', row.task !== '—' ? `task=${row.task}` : '', row.details, `trace=${row.traceId}`].filter(Boolean).join(' ')}`
