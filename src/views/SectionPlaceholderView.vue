<script setup lang="ts">
defineProps<{ title: string; description: string; eyebrow?: string }>()
</script>

<template>
  <section class="standard-page">
    <header class="standard-page__header">
      <div>
        <p class="page-eyebrow">{{ eyebrow ?? 'AMR CONTROL' }}</p>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
    </header>
    <div class="planned-surface">
      <span class="planned-mark">PLAN</span>
      <div>
        <h2>页面结构待下一阶段细化</h2>
        <p>导航、路由与页面边界已经建立；字段和交互将在对应需求确认后补充。</p>
      </div>
    </div>
  </section>
</template>
