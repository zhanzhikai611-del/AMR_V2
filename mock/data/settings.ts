import type { DictionaryItem, OperationLog, SystemLog, SystemRole, SystemUser } from '../../src/types/settings'

export const systemUsers:SystemUser[] = [
  {username:'admin.system',name:'系统管理员',role:'系统管理员',status:'启用',lastLogin:'2026-08-19 14:20',createdAt:'2026-07-20'},
  {username:'viewer.ops',name:'运行查看',role:'只读用户',status:'启用',lastLogin:'2026-08-19 13:46',createdAt:'2026-07-20'},
  {username:'dev.dispatch',name:'调度研发',role:'研发人员',status:'启用',lastLogin:'2026-08-19 11:32',createdAt:'2026-07-22'},
  {username:'dev.frontend',name:'前端研发',role:'研发人员',status:'启用',lastLogin:'2026-08-19 09:18',createdAt:'2026-07-22'},
  {username:'demo.viewer',name:'演示账号',role:'只读用户',status:'启用',lastLogin:'2026-08-18 16:42',createdAt:'2026-07-25'},
  {username:'temp.test',name:'临时测试',role:'研发人员',status:'停用',lastLogin:'2026-08-16 11:08',createdAt:'2026-07-26'},
]
export const systemRoles:SystemRole[] = [
  {name:'只读用户',users:3,summary:'查看实时运行状态与数据分析结果',boundary:'实时监控 · 数据分析',tone:'gray'},
  {name:'研发人员',users:12,summary:'负责业务运行、地图、资源与行为配置',boundary:'业务功能与配置页面',tone:'cyan'},
  {name:'系统管理员',users:2,summary:'负责账号、固定角色范围与日志审计',boundary:'仅系统设置页面',tone:'blue'},
]
export const dictionaryItems:DictionaryItem[] = [
  {category:'AMR_STATUS',code:'RUNNING',name:'运行',color:'#1677FF',order:10,status:'启用'},{category:'AMR_STATUS',code:'IDLE',name:'空闲',color:'#20A66A',order:20,status:'启用'},{category:'AMR_STATUS',code:'ABNORMAL',name:'异常',color:'#D92D20',order:30,status:'启用'},{category:'AMR_STATUS',code:'OFFLINE',name:'离线',color:'#526473',order:40,status:'启用'},{category:'AMR_STATUS',code:'CHARGING',name:'充电',color:'#00A6A6',order:50,status:'启用'},{category:'AMR_STATUS',code:'DISABLED',name:'停用',color:'#8192A1',order:60,status:'启用'},{category:'TASK_STATUS',code:'QUEUED',name:'待执行',color:'#D99A16',order:10,status:'启用'},{category:'TASK_STATUS',code:'RUNNING',name:'执行中',color:'#1677FF',order:20,status:'启用'},{category:'TASK_STATUS',code:'ABNORMAL',name:'异常',color:'#D92D20',order:30,status:'启用'},
]
export const operationLogs:OperationLog[] = [
  {time:'14:52:16',user:'dev.dispatch',module:'任务管理',action:'调整派单策略',object:'规则优先',result:'成功',description:'APS 辅助排程保持关闭'},
  {time:'14:48:03',user:'ops.zhang',module:'实时监控',action:'查看车辆',object:'AMR-03',result:'成功',description:'打开行为监控'},
  {time:'14:43:58',user:'dev.frontend',module:'地图管理',action:'保存草稿',object:'MAP-A V1.9',result:'成功',description:'更新导航路线 R-21'},
  {time:'14:39:26',user:'dev.dispatch',module:'行为树管理',action:'绑定 AMR',object:'BT-001',result:'成功',description:'绑定 AMR-01 / AMR-02'},
  {time:'14:31:11',user:'demo.viewer',module:'资源管理',action:'查看',object:'AMR-06',result:'成功',description:'只读访问'},
]
export const systemLogs:SystemLog[] = [
  {time:'14:52:16.042',level:'INFO',service:'task-service',amr:'AMR-03',task:'TSK-260819-022',traceId:'trc_f82a196e',summary:'Task created and queued'},
  {time:'14:48:03.128',level:'INFO',service:'amr-gateway',amr:'AMR-03',task:'TSK-260819-021',traceId:'trc_4c8e123f',summary:'Position state updated'},
  {time:'14:43:58.315',level:'ERROR',service:'task-service',amr:'—',task:'—',traceId:'trc_15ac40c2',summary:'Invalid request station: D18'},
  {time:'14:39:26.084',level:'WARN',service:'device-gateway',amr:'—',task:'TSK-260819-020',traceId:'trc_79de03b8',summary:'D16 robot arm entered fault state'},
  {time:'14:31:11.492',level:'INFO',service:'dispatch-service',amr:'AMR-02',task:'TSK-260819-018',traceId:'trc_3ef1429a',summary:'Vehicle assigned in 22ms'},
]
