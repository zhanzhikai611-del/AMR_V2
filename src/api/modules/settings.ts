import { http } from '../http'
import type { DictionaryItem, OperationLog, SystemLog, SystemRole, SystemUser } from '../../types/settings'
const useMock = import.meta.env.VITE_USE_MOCK !== 'false'
async function mockData(){ await new Promise(r=>setTimeout(r,100)); return import('../../../mock/data/settings') }
export async function getSystemUsers():Promise<SystemUser[]>{ if(useMock)return structuredClone((await mockData()).systemUsers); return (await http.get<{data:SystemUser[]}>('/settings/users')).data.data }
export async function getSystemRoles():Promise<SystemRole[]>{ if(useMock)return structuredClone((await mockData()).systemRoles); return (await http.get<{data:SystemRole[]}>('/settings/roles')).data.data }
export async function getDictionaryItems():Promise<DictionaryItem[]>{ if(useMock)return structuredClone((await mockData()).dictionaryItems); return (await http.get<{data:DictionaryItem[]}>('/settings/dictionaries')).data.data }
export async function getOperationLogs():Promise<OperationLog[]>{ if(useMock)return structuredClone((await mockData()).operationLogs); return (await http.get<{data:OperationLog[]}>('/settings/operation-logs')).data.data }
export async function getSystemLogs():Promise<SystemLog[]>{ if(useMock)return structuredClone((await mockData()).systemLogs); return (await http.get<{data:SystemLog[]}>('/settings/system-logs')).data.data }
