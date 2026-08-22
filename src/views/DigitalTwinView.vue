<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DigitalTwinMap from '../features/digital-twin/DigitalTwinMap.vue'
import FleetStatusRail from '../features/digital-twin/FleetStatusRail.vue'
import ObjectInspector from '../features/digital-twin/ObjectInspector.vue'
import { useMonitorContextStore } from '../stores/monitor-context'
import { useTwinSimulation } from '../features/digital-twin/useTwinSimulation'

const monitor = useMonitorContextStore()
const inspectorCollapsed = ref(false)
const sourceAmrs = computed(() => monitor.snapshot?.amrs ?? [])
const sourceTasks = computed(() => monitor.snapshot?.tasks ?? [])
const { displayAmrs, routeProgress } = useTwinSimulation(sourceAmrs, sourceTasks)
const selectedDisplayAmr = computed(() => displayAmrs.value.find(amr => amr.id === monitor.selectedAmrId) ?? null)

function selectAmr(id: string) {
  monitor.selectAmr(id)
  inspectorCollapsed.value = false
}

function closeInspector() {
  inspectorCollapsed.value = false
  monitor.clearSelection()
}

function updateServiceScope(payload: { amrId: string; serviceDevices: string[] }) {
  const amr = monitor.snapshot?.amrs.find((item) => item.id === payload.amrId)
  if (amr) {
    if (!amr.maxServiceDevices) amr.maxServiceDevices = [...amr.serviceDevices]
    amr.serviceDevices = [...payload.serviceDevices]
  }
}

function toggleDispatch(amrId: string) {
  const amr = monitor.snapshot?.amrs.find((item) => item.id === amrId)
  if (amr) amr.dispatchStatus = amr.dispatchStatus === 'paused' ? 'enabled' : 'paused'
}
onMounted(() => { if (!monitor.snapshot) void monitor.loadSnapshot() })
</script>

<template>
  <section class="twin-page">
    <div v-if="monitor.loading" class="page-state"><span class="loading-mark"></span><strong>正在读取运行态势</strong></div>
    <div v-else-if="monitor.error" class="page-state error"><strong>{{ monitor.error }}</strong><button type="button" @click="monitor.loadSnapshot">重新加载</button></div>
    <template v-else-if="monitor.snapshot">
      <FleetStatusRail :snapshot="monitor.snapshot" />
      <div class="twin-stage" :class="{ inspecting: monitor.selectedAmrId || monitor.selectedTaskId, 'inspector-collapsed': inspectorCollapsed }">
        <DigitalTwinMap
          :amrs="displayAmrs"
          :resources="monitor.snapshot.resources"
          :tasks="monitor.snapshot.tasks"
          :topology="monitor.snapshot.topology"
          :selected-amr-id="monitor.selectedAmrId"
          :selected-task-id="monitor.selectedTaskId"
          :inspector-open="Boolean((monitor.selectedAmrId || monitor.selectedTaskId) && !inspectorCollapsed)"
          :route-progress="routeProgress"
          @select-amr="selectAmr"
        />
        <Transition name="inspector">
          <ObjectInspector
            v-if="(monitor.selectedAmrId || monitor.selectedTaskId) && !inspectorCollapsed"
            :task="monitor.selectedTask"
            :amr="selectedDisplayAmr"
            @collapse="inspectorCollapsed = true"
            @close="closeInspector"
            @update-service-scope="updateServiceScope"
            @toggle-dispatch="toggleDispatch"
          />
        </Transition>
        <button v-if="(monitor.selectedAmrId || monitor.selectedTaskId) && inspectorCollapsed" class="object-inspector-reopen" type="button" @click="inspectorCollapsed = false"><span>{{ monitor.selectedAmr?.id ?? monitor.selectedTask?.id }}</span><b>展开详情</b><i>‹</i></button>
      </div>
    </template>
  </section>
</template>
