<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
</script>

<template>
  <svg class="app-icon" :width="size ?? 18" :height="size ?? 18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <template v-if="name === 'twin'">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>
    </template>
    <template v-else-if="name === 'records'">
      <path d="M6 3h9l3 3v15H6V3Z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>
    </template>
    <template v-else-if="name === 'behavior'">
      <circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 5h2a3 3 0 0 1 3 3v1a3 3 0 0 0 3 3M8 19h2a3 3 0 0 0 3-3v-1a3 3 0 0 1 3-3"/>
    </template>
    <template v-else-if="name === 'resources'">
      <rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/>
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 6.1a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4L19 13a7 7 0 0 0 0-1Z"/>
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8ZM10 21h4"/>
    </template>
    <template v-else-if="name === 'panel'">
      <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m8 10 4 4 4-4"/>
    </template>
    <template v-else-if="name === 'close'">
      <path d="m6 6 12 12M18 6 6 18"/>
    </template>
    <template v-else-if="name === 'layers'">
      <path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="8"/>
    </template>
  </svg>
</template>

<style scoped>
.app-icon { display: block; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
</style>
