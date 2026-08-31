<script setup lang="ts">
import pointcloudMap from '../../assets/cnc-pointcloud-map.png'
import { POINTCLOUD_FRAME } from './map-geometry'
</script>

<template>
  <image :href="pointcloudMap" v-bind="POINTCLOUD_FRAME" preserveAspectRatio="none" />
</template>
