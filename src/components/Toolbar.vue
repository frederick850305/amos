<template>
  <div class="toolbar">
    <button v-for="b in buttons" :key="b.action" class="tb-btn" :title="b.title" @click="run(b.action)">
      <span class="tb-ico" v-html="icons[b.icon]" />
      <span class="tb-label">{{ b.title }}</span>
    </button>
  </div>
</template>

<script setup>
import { openWindow, showDialog, showToast } from '../store.js'

// 仅保留跨窗口的「系统级」功能按钮。
// 业务操作（New / Open / Save / Delete / Find）由各业务视图自身的
// bw-head 工具栏承载 —— BS 架构下每个 Tab 是自包含工作区，
// 不再需要 CS/MDI 风格的全局业务代理按钮（避免与视图内按钮冲突）。
const icons = {
  print: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9V3h12v6 M6 18H4v-7h16v7h-2 M8 14h8v7H8z"/></svg>',
  options: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
  switch: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
}

const buttons = [
  { action: 'print', title: 'Print', icon: 'print' },
  { action: 'selectview', title: 'Select View', icon: 'options' },
  { action: 'switch-department', title: 'Switch Dept', icon: 'switch' },
  { action: 'dashboard', title: 'Dashboard', icon: 'dashboard' },
  { action: 'lock', title: 'Lock', icon: 'lock' },
]

function run(action) {
  if (action === 'dashboard') return openWindow('dashboard')
  if (action === 'selectview') return showDialog('select-view')
  if (action === 'switch-department') return showDialog('switch-department')
  if (action === 'lock') return showToast('应用已锁定（原型演示）', 'warn')
  if (action === 'print') return window.print()
}
</script>

<style scoped>
.toolbar { display: flex; gap: 3px; padding: 5px 8px; background: var(--amos-panel); border-bottom: 1px solid var(--amos-border); align-items: center; }
.tb-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 56px; padding: 4px 2px; border: 1px solid transparent; border-radius: 5px; background: transparent; cursor: pointer; color: #3e5068; }
.tb-btn:hover { background: #fff; border-color: var(--amos-border); color: var(--amos-blue); }
.tb-ico { color: var(--amos-blue); display: flex; }
.tb-label { font-size: 10.5px; }
@media (max-width: 1100px) { .tb-label { display: none; } .tb-btn { width: 38px; } }
</style>
