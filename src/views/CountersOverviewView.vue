<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Counters Overview</h2>
      <div class="row" style="gap:6px">
        <button class="amos-btn sm" @click="showFind = true">查找 / Find</button>
        <span class="muted">只读视图（手册 3.1：仅显示当前读数，不可更新）</span>
      </div>
    </div>

    <!-- 查找窗口：3 种查找条件（手册 3.1）-->
    <Modal v-if="showFind" title="Find Counters" width="500px" @close="showFind = false">
      <div class="amos-field">
        <label>Component Criteria（按部件）</label>
        <div class="ctrl"><input class="amos-input" v-model="crit.component" placeholder="部件编码，如 C-10001" /></div>
      </div>
      <div class="amos-field">
        <label>Function Criteria（按功能位置）</label>
        <div class="ctrl"><input class="amos-input" v-model="crit.function" placeholder="功能编码，如 FN-ENG-01" /></div>
      </div>
      <div class="amos-field">
        <label>Inherits from component（所继承部件）</label>
        <div class="ctrl">
          <input class="amos-input" v-model="crit.inherits" placeholder="父部件编码" />
          <label class="row" style="gap:6px"><input type="checkbox" v-model="crit.includeChildren" /> <span class="muted">包含继承的子部件读数</span></label>
        </div>
      </div>
      <template #footer>
        <button class="amos-btn" @click="showFind = false">Cancel</button>
        <button class="amos-btn primary" @click="applyFind">OK</button>
      </template>
    </Modal>

    <div class="bw-body">
      <table class="amos-grid ov-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>Function</th>
            <th>Counter</th>
            <th>Depends On</th>
            <th class="num">Current Value</th>
            <th class="num">Average（日均）</th>
            <th>Latest Zeroed Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.component + r.counter">
            <td>{{ r.component }}</td>
            <td>{{ r.function }}</td>
            <td>{{ r.counter }} <span class="muted">({{ r.description }})</span></td>
            <td>{{ r.dependsOn || '—' }}</td>
            <td class="num">{{ r.currentValue }} {{ r.unit }}</td>
            <td class="num">{{ r.average }} {{ r.unit }}/d</td>
            <td>{{ r.latestZeroedDate }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="7" class="muted" style="text-align:center;padding:18px">无计数器读数，调整查找条件。</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../components/Modal.vue'
import { componentService } from '../services/componentService.js'
import { counterService } from '../services/counterService.js'

const showFind = ref(true)
const crit = ref({ component: '', function: '', inherits: '', includeChildren: true })

const compByNo = computed(() => componentService.byNo())

// Average = 当前读数 / 自安装（或读数日往前 365 天基准）的天数
function averageOf(rec) {
  const comp = compByNo.value[rec.component]
  const base = comp?.installDate || rec.latestZeroedDate
  let days = 365
  if (base) {
    const d = (new Date(rec.latestZeroedDate) - new Date(base)) / 86400000
    if (d > 0) days = d
  }
  return (rec.currentValue / days).toFixed(1)
}

const rows = computed(() => {
  const c = crit.value
  return counterService.allCounters()
    .filter((r) => {
      if (c.component && r.component !== c.component) return false
      if (c.function && r.function !== c.function) return false
      if (c.inherits) {
        const childOf = (no) => {
          let cur = compByNo.value[no]
          while (cur && cur.parentComponent) {
            if (cur.parentComponent === c.inherits) return true
            cur = compByNo.value[cur.parentComponent]
          }
          return false
        }
        // 手册 P44：Inherits from component 同时按父子关系与计数器依赖（dependsOn）匹配
        const matchInherits =
          r.component === c.inherits ||
          (c.includeChildren && childOf(r.component)) ||
          r.dependsOn === c.inherits
        if (!matchInherits) return false
      }
      return true
    })
    .map((r) => ({ ...r, average: averageOf(r) }))
})

function applyFind() { showFind.value = false }
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.bw-body { flex: 1; padding: 10px; overflow: auto; }
.ov-table { width: 100%; }
</style>
