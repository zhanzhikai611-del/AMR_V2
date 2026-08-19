import type { MapEditorDraft, MapPlacedResource } from '../../src/types/domain'

const columns = [180, 310, 440, 570, 700, 830]
const rows = [105, 220, 335, 465, 520]
const points = columns.flatMap((x, column) => rows.map((y, row) => ({ id: `P-${String(column * rows.length + row + 1).padStart(2,'0')}`, x, y, type: '路网节点' as const })))
const pointId = (column:number,row:number) => points[column * rows.length + row].id
const route = (id:string,c1:number,r1:number,c2:number,r2:number) => ({ id, startId:pointId(c1,r1), endId:pointId(c2,r2), direction:'双向通行', speed:1.2 })
const resources: MapPlacedResource[] = [
  { id:'CNC-02',resourceType:'CNC',pointId:pointId(0,1),x:180,y:170,approach:'90° · 向北' },
  { id:'CNC-03',resourceType:'CNC',pointId:pointId(1,1),x:310,y:195,approach:'90° · 向北' },
  { id:'CNC-01',resourceType:'CNC',pointId:pointId(2,1),x:440,y:170,approach:'90° · 向北' },
  { id:'CNC-04',resourceType:'CNC',pointId:pointId(3,1),x:570,y:170,approach:'90° · 向北' },
  { id:'CNC-05',resourceType:'CNC',pointId:pointId(4,1),x:700,y:170,approach:'90° · 向北' },
  { id:'CNC-06',resourceType:'CNC',pointId:pointId(5,1),x:830,y:170,approach:'90° · 向北' },
  { id:'CNC-07',resourceType:'CNC',pointId:pointId(0,3),x:180,y:400,approach:'270° · 向南' },
  { id:'HOME-01',resourceType:'HOME',pointId:pointId(1,3),x:310,y:400,approach:'270° · 向南' },
  { id:'CNC-08',resourceType:'CNC',pointId:pointId(3,3),x:570,y:400,approach:'270° · 向南' },
  { id:'GATE-01',resourceType:'GATE',pointId:pointId(2,4),x:440,y:490,approach:'0° · 向东' },
  { id:'GATE-02',resourceType:'GATE',pointId:pointId(5,2),x:830,y:305,approach:'0° · 向东' },
  { id:'CHG-01',resourceType:'CHG',pointId:pointId(0,4),x:180,y:490,approach:'0° · 向东' },
  { id:'BUF-02',resourceType:'BUF',pointId:pointId(4,4),x:700,y:490,approach:'0° · 向东' },
  { id:'BUF-01',resourceType:'BUF',pointId:pointId(5,4),x:830,y:490,approach:'0° · 向东' },
]

export const mapEditorDrafts: Record<string, MapEditorDraft> = {
  'MAP-A': {
    mapId:'MAP-A', version:'V1.9', resolution:'0.05 m/px', points,
    routes:[
      ...columns.flatMap((_,c) => rows.slice(0,-1).map((__,r) => route(`RV-${c}-${r}`,c,r,c,r+1))),
      ...rows.filter((_,r)=>r===1||r===4).flatMap((_,r) => columns.slice(0,-1).map((__,c) => route(`RH-${r}-${c}`,c,r,c+1,r))),
      route('RD-01',0,1,1,2), route('RD-02',2,1,3,2), route('RD-03',4,1,5,2),
    ], resources,
    zones:[{ id:'ZONE-A3',x:405,y:230,width:205,height:66,type:'互斥区 · 同时允许 1 台 AMR' }],
  },
}
