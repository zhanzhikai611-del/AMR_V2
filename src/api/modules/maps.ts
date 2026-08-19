import { http } from '../http'
import type { MapEditorDraft } from '../../types/domain'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'
export async function getMapDraft(id: string): Promise<MapEditorDraft> {
  if (useMock) {
    const { mapEditorDrafts } = await import('../../../mock/data/map-editor')
    const source = mapEditorDrafts[id] ?? { ...mapEditorDrafts['MAP-A'], mapId: id, version: 'V0.1' }
    return structuredClone(source)
  }
  return (await http.get<{ data: MapEditorDraft }>(`/maps/${id}/draft`)).data.data
}
export async function saveMapDraft(id: string, draft: MapEditorDraft) {
  if (useMock) { await new Promise(r => setTimeout(r, 180)); return structuredClone(draft) }
  return (await http.put<{ data: MapEditorDraft }>(`/maps/${id}/draft`, draft)).data.data
}
export async function validateMapDraft(id: string) {
  if (useMock) { await new Promise(r => setTimeout(r, 160)); return { errors: 0, warnings: 2 } }
  return (await http.post<{ data: { errors:number; warnings:number } }>(`/maps/${id}/validate`)).data.data
}
export async function publishMapDraft(id: string) {
  if (useMock) { await new Promise(r => setTimeout(r, 180)); return { published: true } }
  return (await http.post<{ data: { published:boolean } }>(`/maps/${id}/publish`)).data.data
}
