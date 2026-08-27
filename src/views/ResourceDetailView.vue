<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getResourceCatalog } from '../api/modules/resources'
import type { ResourceCatalog } from '../types/domain'

const props = defineProps<{ kind: 'amr' | 'device' }>()
const route = useRoute()
const router = useRouter()
const catalog = ref<ResourceCatalog | null>(null)

const item = computed(() => props.kind === 'amr'
  ? catalog.value?.amrs.find(resource => resource.id === route.params.id)
  : catalog.value?.devices.find(resource => resource.id === route.params.id))
const serviceAmrs = computed(() => props.kind === 'device'
  ? catalog.value?.amrs.filter(amr => amr.serviceDevices.includes(route.params.id as string)) ?? []
  : [])

onMounted(async () => { catalog.value = await getResourceCatalog() })
</script>

<template>
  <section v-if="item" class="resource-page detail-page">
    <header class="resource-page__header">
      <div>
        <button class="back-link" type="button" @click="router.back()">← 返回{{ kind === 'amr' ? ' AMR 列表' : '设备列表' }}</button>
        <p class="page-eyebrow">RESOURCE DETAIL</p>
        <h1>{{ item.id }}</h1>
      </div>
      <button class="resource-primary-action" type="button">编辑资料</button>
    </header>

    <template v-if="kind === 'amr' && 'ip' in item">
      <section class="detail-panel">
        <header>AMR 信息</header>
        <dl class="detail-grid">
          <div><dt>名称</dt><dd>{{ item.name }}</dd></div>
          <div><dt>IP 地址</dt><dd class="type-data">{{ item.ip }}</dd></div>
          <div><dt>所属型号</dt><dd>{{ item.model }}</dd></div>
          <div><dt>底盘类型</dt><dd>{{ item.chassis }}</dd></div>
          <div><dt>初始点位</dt><dd>{{ item.initialPoint }}</dd></div>
          <div><dt>额定载荷</dt><dd>{{ item.ratedLoad }}</dd></div>
          <div><dt>运行状态</dt><dd><span class="asset-status" :class="item.tone">{{ item.status }}</span></dd></div>
          <div><dt>当前电量</dt><dd>{{ item.battery }}%</dd></div>
        </dl>
      </section>
      <section class="detail-panel">
        <header>服务范围</header>
        <div class="scope-detail"><div><span>服务 CNC</span><p><i v-for="id in (item.maxServiceDevices ?? item.serviceDevices)" :key="id" :class="{ unavailable: !item.serviceDevices.includes(id) }">{{ id }}</i></p></div></div>
      </section>
    </template>

    <template v-else-if="'type' in item">
      <section class="detail-panel">
        <header>设备信息</header>
        <dl class="detail-grid">
          <div><dt>设备名称</dt><dd>{{ item.name }}</dd></div>
          <div><dt>设备类型</dt><dd>CNC</dd></div>
          <div><dt>设备组</dt><dd>{{ item.group }}</dd></div>
          <div><dt>绑定点位</dt><dd>{{ item.boundPoint }}</dd></div>
          <div><dt>启用状态</dt><dd>{{ item.enabled ? '启用' : '停用' }}</dd></div>
          <div><dt>连接状态</dt><dd>{{ item.connected ? '在线' : '离线' }}</dd></div>
        </dl>
      </section>
      <section class="detail-panel">
        <header>服务 AMR</header>
        <div class="scope-detail"><div><span>已建立服务关系</span><p><i v-for="amr in serviceAmrs" :key="amr.id">{{ amr.id }}</i></p></div></div>
      </section>
    </template>
  </section>
</template>
