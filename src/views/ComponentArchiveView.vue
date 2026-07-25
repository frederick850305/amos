<template>
  <div class="archive-win">
    <div class="aw-head">
      <h2>{{ title }}</h2>
      <span class="muted">Component：{{ store.archiveComponentNo || '—' }}</span>
    </div>
    <div v-if="!store.archiveComponentNo" class="aw-empty muted">
      请在 Components 窗口选择一个组件，再通过 Options ▾ &gt; Archive 打开对应档案窗口。
    </div>
    <div v-else class="table-wrap">
      <table class="amos-grid sub">
        <thead><tr><th>Archive Type</th><th>From Dept.</th><th>To Dept.</th><th>Date</th><th>Historical Data（先前所属部门）</th></tr></thead>
        <tbody>
          <tr v-for="a in rows" :key="a.id">
            <td>{{ kindLabel(a.kind) }}</td>
            <td>{{ a.fromDepartment }}</td>
            <td>{{ a.toDepartment }}</td>
            <td>{{ a.archiveDate }}</td>
            <td>{{ a.data }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5" class="muted">该组件无相关档案记录。</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../store.js'
import { componentService } from '../services/componentService.js'

// 手册 Component Archives：Options > Archive > 三种档案窗口
const kindLabels = {
  component: 'Component Archive',
  transfer: 'Component Transfer Archive',
  status: 'Component Status Archive',
}
const kindLabel = (k) => kindLabels[k] || k
const title = computed(() => (store.archiveKind ? kindLabels[store.archiveKind] : 'Component Archives'))
// kind 为空时返回全部三种档案
const rows = computed(() => componentService.getArchives(store.archiveComponentNo, store.archiveKind))
</script>

<style scoped>
.archive-win { padding: 14px; height: 100%; overflow: auto; }
.aw-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.aw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.aw-empty { padding: 30px; text-align: center; }
.table-wrap { overflow-x: auto; }
.amos-grid.sub { border-collapse: collapse; font-size: 12.5px; width: 100%; }
.amos-grid.sub th, .amos-grid.sub td { border: 1px solid var(--amos-border); padding: 5px 8px; text-align: left; vertical-align: top; }
.amos-grid.sub th { background: #f3f6fa; font-weight: 600; color: var(--amos-text-soft); }
</style>
