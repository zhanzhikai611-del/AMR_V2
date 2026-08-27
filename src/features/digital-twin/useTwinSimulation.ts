import { computed, onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue'
import type { Amr, Task } from '../../types/domain'

const CYCLE_MS = 22000
const MOVE_RATIO = 0.92
const FRAME_INTERVAL = 1000 / 30

export function useTwinSimulation(amrsSource:MaybeRefOrGetter<Amr[]>,tasksSource:MaybeRefOrGetter<Task[]>) {
  const elapsed = ref(0)
  const reduceMotion = ref(false)
  let animationFrame = 0
  let startedAt = 0
  let lastFrame = 0
  const pathCache = new Map<string,SVGPathElement>()

  function geometry(pathData:string) {
    let path=pathCache.get(pathData)
    if(!path){path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',pathData);pathCache.set(pathData,path)}
    return path
  }
  function frame(time:number){
    if(!startedAt)startedAt=time
    if(time-lastFrame>=FRAME_INTERVAL){elapsed.value=time-startedAt;lastFrame=time}
    animationFrame=requestAnimationFrame(frame)
  }
  const progressFor=(amr:Amr,task:Task)=>{
    if(reduceMotion.value||amr.status!=='运行'||task.status!=='运行中'||!task.plannedPath)return 0
    const offset=Number(amr.id.slice(-2))*1700
    const cycle=((elapsed.value+offset)%CYCLE_MS)/CYCLE_MS
    return Math.min(cycle/MOVE_RATIO,1)
  }
  const routeProgress=computed<Record<string,number>>(()=>{
    const tasks=toValue(tasksSource),amrs=toValue(amrsSource);const result:Record<string,number>={}
    for(const task of tasks){const amr=amrs.find(item=>item.id===task.amrId);if(amr&&task.status==='运行中')result[task.id]=progressFor(amr,task)}
    return result
  })
  const displayAmrs=computed(()=>{
    const tasks=toValue(tasksSource)
    return toValue(amrsSource).map(amr=>{
      const task=tasks.find(item=>item.id===amr.taskId)
      if(!task||amr.status!=='运行'||task.status!=='运行中'||!task.plannedPath||reduceMotion.value)return amr
      const progress=routeProgress.value[task.id]??0;const path=geometry(task.plannedPath);const length=path.getTotalLength();const current=path.getPointAtLength(length*progress);const next=path.getPointAtLength(Math.min(length,length*progress+1));const heading=Math.atan2(next.y-current.y,next.x-current.x)*180/Math.PI+90
      return {...amr,position:{x:current.x,y:current.y},heading}
    })
  })
  onMounted(()=>{reduceMotion.value=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!reduceMotion.value)animationFrame=requestAnimationFrame(frame)})
  onBeforeUnmount(()=>cancelAnimationFrame(animationFrame))
  return {displayAmrs,routeProgress}
}
