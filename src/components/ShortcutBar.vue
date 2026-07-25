<template>
  <aside class="shortcut-bar">
    <button class="sb-btn" :class="{ active: store.activeKey === 'dashboard' }" @click="open('dashboard')">
      <span v-html="iconHome" class="sb-ico" />
      <span class="sb-label" v-show="showLabels">首页</span>
    </button>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { store, openWindow } from '../store.js'

const iconHome = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/></svg>'

const showLabels = computed(() => store.options.shortcutMode !== 'icon')
function open(key) {
  openWindow(key)
}
</script>

<style scoped>
.shortcut-bar { width: 76px; background: linear-gradient(180deg, #2a5ca8, #1e4c8e); display: flex; flex-direction: column; align-items: center; padding: 8px 0; position: relative; }
.sb-btn { width: 64px; min-height: 52px; border: none; border-radius: 8px; background: rgba(255,255,255,.08); color: #cfe0f5; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 6px 2px; transition: all .15s ease; }
.sb-btn:hover, .sb-btn.active { background: #fff; color: var(--amos-blue); }
.sb-ico { display: flex; }
.sb-label { font-size: 11px; line-height: 1.1; text-align: center; white-space: nowrap; }
</style>
