export interface SystemUser { username:string; name:string; role:'现场人员'|'研发人员'|'只读用户'; status:'启用'|'停用'; lastLogin:string; createdAt:string }
export interface SystemRole { name:string; users:number; summary:string; boundary:string; tone:'blue'|'cyan'|'gray' }
export interface SystemConfiguration { group:string; items:Array<{ key:string; value:string; options?:string[] }> }
export interface DictionaryItem { category:string; code:string; name:string; color:string; order:number; status:'启用'|'停用' }
export interface OperationLog { time:string; user:string; module:string; action:string; object:string; result:'成功'|'失败'; description:string }
export interface SystemLog { time:string; level:'INFO'|'WARN'|'ERROR'; service:string; amr:string; task:string; traceId:string; summary:string }
