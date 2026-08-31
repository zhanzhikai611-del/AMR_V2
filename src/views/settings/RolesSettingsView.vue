<script setup lang="ts">
const pages = [
  { group:'运行信息', page:'实时监控', viewer:true, developer:true, admin:false },
  { group:'运行信息', page:'数据分析', viewer:true, developer:true, admin:false },
  { group:'业务功能', page:'派单中心', viewer:false, developer:true, admin:false },
  { group:'业务功能', page:'行为树管理', viewer:false, developer:true, admin:false },
  { group:'业务功能', page:'地图管理', viewer:false, developer:true, admin:false },
  { group:'业务功能', page:'资源管理', viewer:false, developer:true, admin:false },
  { group:'系统设置', page:'用户管理', viewer:false, developer:false, admin:true },
  { group:'系统设置', page:'角色权限', viewer:false, developer:false, admin:true },
  { group:'系统设置', page:'系统日志', viewer:false, developer:false, admin:true },
]
</script>

<template>
  <section class="settings-page">
    <header class="settings-page__header">
      <div><p class="page-eyebrow">PAGE ACCESS</p><h1>角色权限</h1><p class="settings-lead">按页面划分三个固定角色的访问范围</p></div>
      <span class="settings-fixed-note">固定角色 · 暂不支持自定义</span>
    </header>
    <section class="permission-panel page-access-panel">
      <header><div><strong>页面访问矩阵</strong><small>角色之间不继承，系统管理员不自动拥有业务页面权限</small></div></header>
      <div>
        <table class="access-matrix"><thead><tr><th>页面分组</th><th>页面</th><th>只读用户</th><th>研发人员</th><th>系统管理员</th></tr></thead><tbody><tr v-for="row in pages" :key="row.page"><td>{{row.group}}</td><td><strong>{{row.page}}</strong></td><td><span :class="{allowed:row.viewer}">{{row.viewer?'允许':'—'}}</span></td><td><span :class="{allowed:row.developer}">{{row.developer?'允许':'—'}}</span></td><td><span :class="{allowed:row.admin}">{{row.admin?'允许':'—'}}</span></td></tr></tbody></table>
        <aside><b>权限规则</b><span>权限仅决定页面是否可访问。菜单展示、路由访问与后端接口均应使用同一角色规则。</span></aside>
      </div>
    </section>
  </section>
</template>
