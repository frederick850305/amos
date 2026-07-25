<template>
  <div class="wf">
    <div class="wf-bar">
      <span class="wf-title">Workflow Notifications — 待当前用户确认</span>
      <span v-if="store.presetFilter && store.presetFilter.module" class="tag blue">{{ store.presetFilter.module }}</span>
      <span v-else class="muted">全部模块</span>
    </div>
    <div class="wf-list">
      <div v-for="n in filtered" :key="n.id" class="wf-item" :class="n.tone">
        <span class="wf-mod">{{ n.module }}</span>
        <span class="wf-txt">{{ n.text }}</span>
        <span class="wf-time">{{ n.time }}</span>
      </div>
      <p v-if="!filtered.length" class="muted">暂无待确认的工作流通知。</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../store.js'

// 将 dashboardNotifications 的「数量」展开为占位通知条目（原型数据）
const raw = [
  { module: 'WorkFlow', text: '新工单 WO-260701 需确认计划', time: '2026-07-09 08:12' },
  { module: 'WorkFlow', text: '工单 WO-260650 上报完成待核实', time: '2026-07-09 09:40' },
  { module: 'WorkFlow', text: 'WO-260480 计划延期需审批', time: '2026-07-09 10:05' },
  { module: 'WorkFlow', text: '周期性作业 J-5002 即将到期', time: '2026-07-08 16:20' },
  { module: 'WorkFlow', text: '组件 C-20001 状态变更需确认', time: '2026-07-08 11:33' },
  { module: 'Purchase Approval', text: '采购单 PO-26055 待批准', time: '2026-07-09 08:50' },
  { module: 'Purchase Approval', text: '采购单 PO-26060 部分到货待确认', time: '2026-07-09 09:15' },
  { module: 'Quality Check', text: '质检 QC-3002 结果待录入', time: '2026-07-09 07:45' },
]
const items = raw.map((r, i) => ({ ...r, id: 'n_' + i, tone: i % 2 ? 'alt' : '' }))

const filtered = computed(() => {
  const m = store.presetFilter && store.presetFilter.module
  return m ? items.filter((x) => x.module === m) : items
})
</script>

<style scoped>
.wf { display: flex; flex-direction: column; height: 100%; }
.wf-bar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--amos-border); background: #f7f9fc; }
.wf-title { font-size: 13px; font-weight: 700; color: #2c486a; }
.wf-list { flex: 1; overflow: auto; padding: 8px 14px; }
.wf-item { display: grid; grid-template-columns: 150px 1fr 150px; gap: 10px; align-items: center; padding: 8px 6px; border-bottom: 1px dashed var(--amos-border); font-size: 12.5px; }
.wf-item.alt { background: #fafbfd; }
.wf-mod { font-weight: 700; color: var(--amos-blue); }
.wf-time { text-align: right; color: var(--amos-text-soft); font-size: 11.5px; }
.muted { color: var(--amos-text-soft); font-size: 12px; padding: 10px 0; }
</style>
