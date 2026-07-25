<template>
  <div class="biz-win">
    <div class="bw-head">
      <h2>Component Status Log</h2>
      <span class="muted">{{ logs.length }} 条状态变更记录</span>
      <div class="row" style="gap:6px">
        <input class="amos-input sm" v-model="kw" placeholder="过滤组件编号 / 名称" style="width:180px" />
        <button class="amos-btn sm" @click="refresh">Refresh</button>
      </div>
    </div>
    <div class="bw-body single">
      <section class="bw-list" style="padding:10px">
        <table class="amos-grid">
          <thead>
            <tr>
              <th>Date</th><th>Component</th><th>Name</th><th>Old</th><th>New</th><th>By</th><th>Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in filtered" :key="l.id">
              <td>{{ l.changedAt }}</td>
              <td>{{ l.componentNo }}</td>
              <td>{{ l.componentName }}</td>
              <td><span class="tag" :class="statusClass(l.oldStatus)">{{ l.oldStatus }}</span></td>
              <td><span class="tag" :class="statusClass(l.newStatus)">{{ l.newStatus }}</span></td>
              <td>{{ l.changedBy }}</td>
              <td>{{ l.reason }}</td>
            </tr>
            <tr v-if="!filtered.length"><td colspan="7" class="muted" style="text-align:center;padding:12px">暂无状态变更记录。</td></tr>
          </tbody>
        </table>
        <p class="hint">手册（Component Status）：所有组件状态变更（安装 / 拆卸自动推导、Options &gt; Change Status、Transferred 与 Stock Wanted 交互）都会在此汇总，对应 Maintenance &gt; Component Status Log。</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { componentService } from '../services/componentService.js'

const logs = ref([])
const kw = ref('')
const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase()
  if (!k) return logs.value
  return logs.value.filter((l) => (l.componentNo || '').toLowerCase().includes(k) || (l.componentName || '').toLowerCase().includes(k))
})
async function refresh() {
  logs.value = await componentService.getAllStatusLogs()
}
function statusClass(v) {
  const s = String(v).toLowerCase()
  if (/(in use|available|active)/.test(s)) return 'green'
  if (/(transferred)/.test(s)) return 'blue'
  if (/(scrapped|obsolete)/.test(s)) return 'red'
  return 'gray'
}
onMounted(refresh)
</script>

<style scoped>
.biz-win { display: flex; flex-direction: column; height: 100%; }
.bw-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; border-bottom: 1px solid var(--amos-border); }
.bw-head h2 { margin: 0; font-size: 15px; color: #2c486a; flex-shrink: 0; }
.bw-head .row { display: flex; gap: 6px; align-items: center; }
.bw-body.single { flex: 1; overflow: auto; }
.bw-list { height: 100%; overflow: auto; }
.hint { font-size: 11.5px; color: var(--amos-text-soft); margin-top: 10px; }
</style>
