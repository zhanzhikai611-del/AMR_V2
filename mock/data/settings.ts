import type { DictionaryItem, SystemLog, SystemRole, SystemUser } from '../../src/types/settings'
import { permissionPages } from '../../src/features/settings/permissions'

export const systemUsers: SystemUser[] = [
  { username:'admin.system', name:'系统管理员', role:'系统管理员', status:'启用', lastLogin:'2026-08-31 08:20:13', createdAt:'2026-07-20' },
  { username:'viewer.ops', name:'运行查看', role:'只读用户', status:'启用', lastLogin:'2026-08-31 08:46:25', createdAt:'2026-07-20' },
  { username:'dev.dispatch', name:'调度研发', role:'研发人员', status:'启用', lastLogin:'2026-08-31 09:32:41', createdAt:'2026-07-22' },
  { username:'dev.frontend', name:'前端研发', role:'研发人员', status:'启用', lastLogin:'2026-08-30 09:18:07', createdAt:'2026-07-22' },
  { username:'demo.viewer', name:'演示账号', role:'只读用户', status:'启用', lastLogin:'2026-08-30 16:42:11', createdAt:'2026-07-25' },
  { username:'temp.test', name:'临时测试', role:'研发人员', status:'停用', lastLogin:'2026-08-26 11:08:39', createdAt:'2026-07-26' },
]
export const systemRoles: SystemRole[] = [
  { name:'只读用户', summary:'查看实时运行状态与数据分析结果', builtin:true, permissions:['twin', 'analytics'] },
  { name:'研发人员', summary:'负责业务运行、地图、资源与行为配置', builtin:true, permissions:permissionPages.filter(p => p.group !== '系统设置').map(p => p.id) },
  { name:'系统管理员', summary:'负责账号、角色权限与系统日志', builtin:true, permissions:['users', 'roles', 'system-logs'] },
]
export const dictionaryItems: DictionaryItem[] = [
  {category:'AMR_STATUS',code:'RUNNING',name:'运行',color:'#1677FF',order:10,status:'启用'},
  {category:'AMR_STATUS',code:'IDLE',name:'空闲',color:'#20A66A',order:20,status:'启用'},
  {category:'AMR_STATUS',code:'ABNORMAL',name:'异常',color:'#D92D20',order:30,status:'启用'},
  {category:'AMR_STATUS',code:'OFFLINE',name:'离线',color:'#526473',order:40,status:'启用'},
  {category:'AMR_STATUS',code:'CHARGING',name:'充电',color:'#00A6A6',order:50,status:'启用'},
  {category:'AMR_STATUS',code:'DISABLED',name:'停用',color:'#8192A1',order:60,status:'启用'},
  {category:'TASK_STATUS',code:'QUEUED',name:'待执行',color:'#D99A16',order:10,status:'启用'},
  {category:'TASK_STATUS',code:'RUNNING',name:'执行中',color:'#1677FF',order:20,status:'启用'},
  {category:'TASK_STATUS',code:'ABNORMAL',name:'异常',color:'#D92D20',order:30,status:'启用'},
]
const localTime = (time: number) => {
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${date.toTimeString().slice(0,8)}.${String(date.getMilliseconds()).padStart(3,'0')}`
}
const anchor = Date.now() - 12000
const events: Array<[SystemLog['level'], string, string, string, string, string, string]> = [
  ['INFO','task-service','TASK_ACCEPTED','AMR-03','TSK-022','搬运任务已入队，等待调度分配','source=MES; pickup=D12; dropoff=D18; priority=5; queue_depth=3'],
  ['INFO','dispatch-service','VEHICLE_ASSIGNED','AMR-03','TSK-022','完成车辆匹配，任务分配至 AMR-03','candidates=4; battery=78%; assignment_cost=22ms; strategy=nearest_available'],
  ['INFO','path-planner','PATH_COMPUTED','AMR-03','TSK-022','全局路径规划完成，已下发导航路段','map=MAP-A; nodes=18; distance=42.6m; elapsed=14ms'],
  ['INFO','amr-gateway','COMMAND_ACK','AMR-03','TSK-022','车辆确认导航指令，任务进入执行状态','command=navigate; sequence=1842; ack_latency=36ms'],
  ['WARN','traffic-service','ZONE_OCCUPIED','AMR-03','TSK-022','交汇区 Z-04 被占用，车辆等待通行许可','occupied_by=AMR-02; wait=3000ms; policy=fifo; deadlock=false'],
  ['INFO','traffic-service','ZONE_RELEASED','AMR-03','TSK-022','交汇区已释放，车辆恢复通行','zone=Z-04; wait_total=4210ms; permit=granted'],
  ['WARN','device-gateway','PLC_ACK_TIMEOUT','AMR-03','TSK-022','D18 输送线握手超时，准备第 1 次重试','endpoint=PLC-D18; timeout=2000ms; retry=1/3; error=ACK_TIMEOUT'],
  ['ERROR','device-gateway','DEVICE_UNAVAILABLE','AMR-03','TSK-022','D18 握手重试耗尽，任务暂停并触发设备告警','endpoint=PLC-D18; retry=3/3; alarm=E-2041; task_state=blocked'],
  ['INFO','device-gateway','PLC_CONNECTION_RESTORED','AMR-03','TSK-022','D18 通信恢复，设备自检通过','endpoint=PLC-D18; reconnect=successful; handshake=ready; alarm=E-2041 cleared'],
  ['INFO','task-service','TASK_RESUMED','AMR-03','TSK-022','设备恢复就绪，继续执行卸货步骤','resume_from=unload; recovery=automatic; idempotency=verified'],
  ['INFO','task-service','TASK_COMPLETED','AMR-03','TSK-022','搬运任务完成，车辆释放为空闲状态','duration=186420ms; pickup=D12; dropoff=D18; result=success'],
  ['WARN','amr-gateway','HEARTBEAT_DELAYED','AMR-06','—','车辆心跳延迟超过阈值，连接进入观察状态','last_seen=3200ms; threshold=3000ms; packet_loss=2; session=active'],
  ['INFO','amr-gateway','HEARTBEAT_RECOVERED','AMR-06','—','心跳恢复，车辆连接状态正常','rtt=24ms; packet_loss=0; consecutive_healthy=3'],
  ['INFO','charge-service','CHARGE_STARTED','AMR-02','—','车辆已对接充电桩，开始自动充电','charger=CHG-02; battery=21%; target=85%; current=18.2A'],
  ['INFO','scheduler','HEALTH_CHECK','—','—','服务健康检查完成，调度循环正常','services=8/8; queue_depth=2; tick=100ms; heap_used=184MB'],
]
export const systemLogs: SystemLog[] = Array.from({length:4}, (_, day) => events.map((e, index) => ({
  id:`log-${day}-${index}`, time:localTime(anchor-day*86400000-(events.length-index)*16000),
  level:e[0], service:e[1], event:e[2], amr:e[3], task:e[4], summary:e[5], details:e[6],
  traceId:`trc_${day}a7f${index <= 10 ? '1842' : String(1842+index)}`, instance:`${e[1]}-01`,
}))).flat().sort((a,b) => b.time.localeCompare(a.time))
