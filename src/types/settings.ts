export type SystemUserRole = string
export interface SystemUser { username:string; name:string; role:SystemUserRole; status:'启用'|'停用'; lastLogin:string; createdAt:string; departmentCode?:string; departmentName?:string; email?:string; loginIp?:string }
export interface SystemRole { name:string; summary:string; builtin:boolean; permissions:string[] }
export interface DictionaryItem { category:string; code:string; name:string; color:string; order:number; status:'启用'|'停用' }
export interface SystemLog { id:string; time:string; level:'INFO'|'WARN'|'ERROR'; service:string; amr:string; task:string; traceId:string; summary:string; event:string; instance:string; details:string }
