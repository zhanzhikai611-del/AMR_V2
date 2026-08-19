<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DigitalTwinMap from '../features/digital-twin/DigitalTwinMap.vue'
import FleetStatusRail from '../features/digital-twin/FleetStatusRail.vue'
import ObjectInspector from '../features/digital-twin/ObjectInspector.vue'
import { useMonitorContextStore } from '../stores/monitor-context'

const monitor = useMonitorContextStore()
const inspectorCollapsed = ref(false)

function selectAmr(id: string) {
  monitor.selectAmr(id)
  inspectorCollapsed.value = false
}

function closeInspector() {
  inspectorCollapsed.value = false
  monitor.clearSelection()
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
          :amrs="monitor.snapshot.amrs"
          :resources="monitor.snapshot.resources"
          :tasks="monitor.snapshot.tasks"
          :topology="monitor.snapshot.topology"
          :selected-amr-id="monitor.selectedAmrId"
          :selected-task-id="monitor.selectedTaskId"
          :inspector-open="Boolean((monitor.selectedAmrId || monitor.selectedTaskId) && !inspectorCollapsed)"
          @select-amr="selectAmr"
        />
        <Transition name="inspector">
          <ObjectInspector
            v-if="(monitor.selectedAmrId || monitor.selectedTaskId) && !inspectorCollapsed"
            :task="monitor.selectedTask"
            :amr="monitor.selectedAmr"
            @collapse="inspectorCollapsed = true"
            @close="closeInspector"
          />
        </Transition>
        <button v-if="(monitor.selectedAmrId || monitor.selectedTaskId) && inspectorCollapsed" class="object-inspector-reopen" type="button" @click="inspectorCollapsed = false"><span>{{ monitor.selectedAmr?.id ?? monitor.selectedTask?.id }}</span><b>展开详情</b><i>‹</i></button>
      </div>
    </template>
  </section>
</template>
