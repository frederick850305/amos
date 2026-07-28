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
import { ref, computed, onMounted } from 'vue'
import Modal from '../components/Modal.vue'
import { componentService } from '../services/componentService.js'
import { counterService } from '../services/counterService.js'

const showFind = ref(true)
const crit = ref({ component: '', function: '', inherits: '', includeChildren: true })

const compByNo = computed(() => componentService.byNo())
const rows = ref([])

// Average 回落计算（后端未给 average 时）：当前读数 / 自安装至读数日的天数
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

// 手册 P44：Inherits from component 按父子关系与计数器依赖（dependsOn）二次过滤（客户端）
function filterInherits(list) {
  const c = crit.value
  if (!c.inherits) return list
  const childOf = (no) => {
    let cur = compByNo.value[no]
    while (cur && cur.parentComponent) {
      if (cur.parentComponent === c.inherits) return true
      cur = compByNo.value[cur.parentComponent]
    }
    return false
  }
  return list.filter(
    (r) =>
      r.component === c.inherits ||
      (c.includeChildren && childOf(r.component)) ||
      r.dependsOn === c.inherits,
  )
}

// 模块 07 后端化：GET /maintenance/counters/overview（失败回落本地缓存聚合，演示模式兼容）
async function load() {
  const c = crit.value
  // 确保组件缓存已就绪（inherits 父子链过滤 / Average 回落需要 installDate 与 parentComponent）
  if (!componentService.listSync().some((x) => typeof x.id === 'number')) {
    await componentService.loadAll().catch(() => {})
  }
  let list
  try {
    list = await counterService.loadOverview({
      component: c.component || '',
      function: c.function || '',
      // inherits=true 让后端只返回有 dependsOn 的计数器；具体父组件匹配在客户端完成
      inherits: !!c.inherits,
    })
  } catch {
    list = counterService.allCounters().filter((r) => {
      if (c.component && r.component !== c.component) return false
      if (c.function && r.function !== c.function) return false
      return true
    })
  }
  rows.value = filterInherits(list).map((r) => ({
    ...r,
    average: r.average !== '' && r.average != null ? r.average : averageOf(r),
  }))
}

onMounted(load)

function applyFind() {
  showFind.value = false
  load()
}
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; }
.bw-body { flex: 1; padding: 10px; overflow: auto; }
.ov-table { width: 100%; }
</style>
