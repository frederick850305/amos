<template>
  <footer class="status-bar">
    <span class="sb-cell ready">Ready</span>
    <span class="sb-sep" />
    <span class="sb-cell">安装地点：<b>{{ store.installation }}</b></span>
    <span class="sb-cell">部门：<b>{{ store.department }}</b></span>
    <span class="sb-sep" />
    <span class="sb-cell">窗口：<b>{{ activeTitle }}</b></span>
    <span class="spacer" />
    <span class="sb-cell" :class="store.synced ? 'ok' : 'warn'">
      <i class="dot" :class="store.synced ? 'green' : 'red'" /> {{ store.synced ? '已同步' : '同步中…' }}
    </span>
    <span class="sb-cell">用户：{{ store.user }}</span>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../store.js'
import { AMOS_PAGES } from '../data/amosData.js'

const activeTitle = computed(() => AMOS_PAGES.find((p) => p.key === store.activeKey)?.title || '—')
</script>

<style scoped>
.status-bar { display: flex; align-items: center; gap: 10px; height: 24px; padding: 0 12px; background: linear-gradient(180deg, #e9eef5, #dde5ee); border-top: 1px solid var(--amos-border); font-size: 11.5px; color: var(--amos-text-soft); }
.sb-cell { white-space: nowrap; }
.sb-cell b { color: #2b3a4d; }
.sb-cell.ready { color: var(--amos-ok); font-weight: 700; }
.sb-cell.ok { color: var(--amos-ok); }
.sb-cell.warn { color: var(--amos-warn); }
.sb-sep { width: 1px; height: 14px; background: var(--amos-border-strong); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
.dot.green { background: var(--amos-ok); }
.dot.red { background: var(--amos-danger); }
</style>
