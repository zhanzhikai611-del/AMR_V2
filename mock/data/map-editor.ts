import type { MapEditorDraft, MapPlacedResource } from '../../src/types/domain'
import { twinSnapshot } from './operations'

const { columns, rows, paths } = twinSnapshot.topology
const points = columns.flatMap((x, column) => rows.map((y, row) => {
  const id = `P-${String(column * rows.length + row + 1).padStart(2,'0')}`
  return { id,name:id,alias:id,description:'',uid:String(2824607600 + column * rows.length + row),ownerGraphName:'map1',x,y,yaw:0,type:'路网节点' as const,poseType:'NORMAL' as const,selectable:true,relocatable:true,disabled:false,narrow:false,disjoint:false,charged:false,dockable:false,parkable:false,deviceId:'',relationType:'无关联' as const,serviceActions:[] }
}))
const pointId = (column:number,row:number) => points[column * rows.length + row].id
const route = (id:string,c1:number,r1:number,c2:number,r2:number) => ({ id,startId:pointId(c1,r1),endId:pointId(c2,r2),direction:'双向通行',speed:1.2 })
const resources:MapPlacedResource[] = twinSnapshot.resources.filter(item=>item.type==='machine').map(item=>({ id:item.id,resourceType:'CNC',pointId:item.boundPoint??'未绑定',x:item.position.x,y:item.position.y,approach:'0° · 向东' }))
const sharedDraft:MapEditorDraft = { mapId:'MAP-A',version:'V1.9',resolution:'0.05 m/px',points,routes:columns.flatMap((_,column)=>rows.slice(0,-1).map((__,row)=>route(`RV-${column}-${row}`,column,row,column,row+1))),topologyPaths:paths,resources,zones:[] }
export const mapEditorDrafts:Record<string,MapEditorDraft> = {
  'MAP-A':sharedDraft,
  'MAP-A-V18':{...sharedDraft,mapId:'MAP-A-V18',version:'V1.8'},
  'MAP-A-V19-03':{...sharedDraft,mapId:'MAP-A-V19-03',version:'V1.9'},
  'MAP-A-V19-06':{...sharedDraft,mapId:'MAP-A-V19-06',version:'V1.9'},
}
